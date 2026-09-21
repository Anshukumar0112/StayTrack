package com.staytrack.backend.model;

import java.util.HashMap;
import java.util.Map;

public class Transfer {

    private String transferId;
    private String paymentId;
    private String bookingId;
    private String hostId;

    private String linkedAccountId;
    private String gatewayTransferId;

    private long amount;
    private String currency;

    private String status;
    private String settlementStatus;

    private String error;

    private long createdAt;
    private long updatedAt;

    public Transfer() {
    }

    public String getTransferId() {
        return transferId;
    }

    public void setTransferId(String transferId) {
        this.transferId = transferId;
    }

    public String getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(String paymentId) {
        this.paymentId = paymentId;
    }

    public String getBookingId() {
        return bookingId;
    }

    public void setBookingId(String bookingId) {
        this.bookingId = bookingId;
    }

    public String getHostId() {
        return hostId;
    }

    public void setHostId(String hostId) {
        this.hostId = hostId;
    }

    public String getLinkedAccountId() {
        return linkedAccountId;
    }

    public void setLinkedAccountId(String linkedAccountId) {
        this.linkedAccountId = linkedAccountId;
    }

    public String getGatewayTransferId() {
        return gatewayTransferId;
    }

    public void setGatewayTransferId(String gatewayTransferId) {
        this.gatewayTransferId = gatewayTransferId;
    }

    public long getAmount() {
        return amount;
    }

    public void setAmount(long amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSettlementStatus() {
        return settlementStatus;
    }

    public void setSettlementStatus(String settlementStatus) {
        this.settlementStatus = settlementStatus;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public long getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(long createdAt) {
        this.createdAt = createdAt;
    }

    public long getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(long updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Map<String, Object> toMap() {

        Map<String, Object> map = new HashMap<>();

        map.put("transferId", transferId);
        map.put("paymentId", paymentId);
        map.put("bookingId", bookingId);
        map.put("hostId", hostId);

        map.put("linkedAccountId", linkedAccountId);
        map.put("gatewayTransferId", gatewayTransferId);

        map.put("amount", amount);
        map.put("currency", currency);

        map.put("status", status);
        map.put("settlementStatus", settlementStatus);

        map.put("error", error);

        map.put("createdAt", createdAt);
        map.put("updatedAt", updatedAt);

        return map;
    }
}