package com.staytrack.backend;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.staytrack.backend.service.PaymentService;
import com.staytrack.backend.service.TransferService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class PaymentAndTransferWorkflowTest {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private TransferService transferService;

    @Test
    void testPaymentAndTransferWorkflow() throws Exception {
        Firestore db = FirestoreClient.getFirestore();

        String customerUid = "test_user_customer_001";
        String hostUid = "test_user_host_applicant_001";
        String bookingId = "test_booking_001";

        // 1. Create Payment Record (Task F)
        Map<String, Object> payment = paymentService.createPaymentRecord(
                customerUid,
                bookingId,
                null,
                "booking",
                6000L,
                "INR",
                "razorpay"
        );
        assertNotNull(payment, "Payment record should not be null");

        String paymentId = (String) payment.get("paymentId");
        assertNotNull(paymentId, "Payment ID should be generated");
        assertEquals("created", payment.get("status"), "Payment status should be created");
        assertEquals(6000L, ((Number) payment.get("amount")).longValue(), "Amount should be 6000");

        // Verify in live Firestore payments collection
        DocumentSnapshot paymentDoc = db.collection("payments").document(paymentId).get().get();
        assertTrue(paymentDoc.exists(), "Payment document must exist in Firestore");
        assertEquals("created", paymentDoc.getString("status"));
        assertEquals("booking", paymentDoc.getString("type"));

        // 2. Create Host Pending Transfer (Task G)
        String linkedAccountId = "acc_test_linked_account_001";
        Map<String, Object> transfer = transferService.createPendingTransfer(
                paymentId,
                bookingId,
                hostUid,
                linkedAccountId,
                5400L,
                "INR"
        );
        assertNotNull(transfer, "Transfer record should not be null");

        String transferId = (String) transfer.get("transferId");
        assertEquals(paymentId, transferId, "Transfer ID should match Payment ID");
        assertEquals("pending", transfer.get("status"), "Transfer status should be pending");
        assertEquals("pending", transfer.get("settlementStatus"), "Settlement status should be pending");

        // Verify in live Firestore transfers collection
        DocumentSnapshot transferDoc = db.collection("transfers").document(transferId).get().get();
        assertTrue(transferDoc.exists(), "Transfer document must exist in Firestore");
        assertEquals("pending", transferDoc.getString("status"));
        assertEquals(hostUid, transferDoc.getString("hostId"));
    }
}
