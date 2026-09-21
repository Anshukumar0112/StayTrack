package com.staytrack.backend.service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.staytrack.backend.repository.TransferRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Periodically reconciles transfer records that may have been left
 * in "processing" after a server crash, timeout, or network failure.
 *
 * This component NEVER creates a new Razorpay transfer by itself.
 * It only asks the existing settlement/reconciliation flow to look
 * for a transfer that may already exist at Razorpay.
 */
@Service
public class TransferRecoveryService {

    private static final Logger log =
            LoggerFactory.getLogger(TransferRecoveryService.class);

    private static final long STALE_AFTER_MINUTES = 10L;
    private static final int BATCH_SIZE = 50;

    private final TransferRepository transferRepository;
    private final TransferService transferService;

    public TransferRecoveryService(
            TransferRepository transferRepository,
            TransferService transferService
    ) {
        this.transferRepository = transferRepository;
        this.transferService = transferService;
    }

    /**
     * Runs every 10 minutes.
     *
     * Fixed delay is used instead of fixed rate so a slow reconciliation
     * run does not cause overlapping executions in the same application
     * instance.
     */
    @Scheduled(fixedDelay = 600_000L)
    public void recoverStaleTransfers() {

        Timestamp cutoff = Timestamp.ofTimeSecondsAndNanos(
                System.currentTimeMillis() / 1000L
                        - (STALE_AFTER_MINUTES * 60L),
                0
        );

        List<QueryDocumentSnapshot> transfers;

        try {
            transfers =
                    transferRepository.findStaleProcessingTransfers(
                            cutoff,
                            BATCH_SIZE
                    );
        } catch (Exception e) {
            log.error(
                    "Unable to load stale transfer records for recovery",
                    e
            );
            return;
        }

        if (transfers.isEmpty()) {
            return;
        }

        log.info(
                "Transfer recovery found {} stale processing transfer(s)",
                transfers.size()
        );

        for (QueryDocumentSnapshot document : transfers) {
            recoverOne(document);
        }
    }

    private void recoverOne(QueryDocumentSnapshot document) {

        String transferId = document.getId();
        Map<String, Object> data = document.getData();

        String paymentId = getString(data.get("paymentId"));

        if (paymentId.isBlank()) {
            log.error(
                    "Transfer {} cannot be reconciled because paymentId is missing",
                    transferId
            );
            recordRecoveryFailure(
                    transferId,
                    "Missing paymentId; manual reconciliation required"
            );
            return;
        }

        try {
            Map<String, Object> reconciled =
                    transferService.reconcileTransfer(paymentId);

            String gatewayTransferId =
                    getString(reconciled.get("gatewayTransferId"));

            if (!gatewayTransferId.isBlank()) {
                log.info(
                        "Recovered transfer {} with Razorpay transfer {}",
                        transferId,
                        gatewayTransferId
                );

                return;
            }

            /*
             * No gateway transfer was found.
             *
             * We deliberately do NOT create another transfer here.
             * The local record remains processing so a temporary
             * Razorpay visibility/network issue cannot turn into a
             * duplicate settlement.
             */
            log.warn(
                    "Transfer {} remains unresolved: no matching Razorpay transfer found",
                    transferId
            );

            recordRecoveryAttempt(
                    transferId,
                    "No matching Razorpay transfer found; automatic retry skipped"
            );

        } catch (Exception e) {

            log.error(
                    "Transfer recovery failed for {}",
                    transferId,
                    e
            );

            recordRecoveryAttempt(
                    transferId,
                    "Reconciliation error: " + safeMessage(e)
            );
        }
    }

    private void recordRecoveryAttempt(
            String transferId,
            String message
    ) {
        try {
            transferRepository.update(
                    transferId,
                    Map.of(
                            "reconciliationStatus", "pending",
                            "lastReconciliationAt", Timestamp.now(),
                            "reconciliationError", message,
                            "updatedAt", Timestamp.now()
                    )
            );
        } catch (Exception e) {
            log.error(
                    "Unable to record reconciliation attempt for {}",
                    transferId,
                    e
            );
        }
    }

    private void recordRecoveryFailure(
            String transferId,
            String message
    ) {
        try {
            transferRepository.update(
                    transferId,
                    Map.of(
                            "reconciliationStatus", "manual_review",
                            "lastReconciliationAt", Timestamp.now(),
                            "reconciliationError", message,
                            "updatedAt", Timestamp.now()
                    )
            );
        } catch (Exception e) {
            log.error(
                    "Unable to record reconciliation failure for {}",
                    transferId,
                    e
            );
        }
    }

    private String getString(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String safeMessage(Exception e) {
        String message = e.getMessage();
        if (message == null || message.isBlank()) {
            return e.getClass().getSimpleName();
        }
        return message.length() > 500
                ? message.substring(0, 500)
                : message;
    }
}
