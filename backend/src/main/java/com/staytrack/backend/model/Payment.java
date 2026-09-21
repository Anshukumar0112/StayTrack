package com.staytrack.backend.model;

import java.util.HashMap;
import java.util.Map;

public class Payment {

    private String paymentId;
    private String userId;
    private String bookingId;
    private String subscriptionId;
    private String type;
    private long amount;
    private String currency;
    private String gateway;
    private String gatewayPaymentId;
    private String gatewayOrderId;
    private String status;
    private Object createdAt;
    private Object updatedAt;

    public Payment() {
    }

    public String getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(String paymentId) {
        this.paymentId = paymentId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getBookingId() {
        return bookingId;
    }

    public void setBookingId(String bookingId) {
        this.bookingId = bookingId;
    }

    public String getSubscriptionId() {
        return subscriptionId;
    }

    public void setSubscriptionId(String subscriptionId) {
        this.subscriptionId = subscriptionId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
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

    public String getGateway() {
        return gateway;
    }

    public void setGateway(String gateway) {
        this.gateway = gateway;
    }

    public String getGatewayPaymentId() {
        return gatewayPaymentId;
    }

    public void setGatewayPaymentId(String gatewayPaymentId) {
        this.gatewayPaymentId = gatewayPaymentId;
    }

    public String getGatewayOrderId() {
        return gatewayOrderId;
    }

    public void setGatewayOrderId(String gatewayOrderId) {
        this.gatewayOrderId = gatewayOrderId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Object getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Object createdAt) {
        this.createdAt = createdAt;
    }

    public Object getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Object updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Map<String, Object> toMap() {

        Map<String, Object> data = new HashMap<>();

        data.put("paymentId", paymentId);
        data.put("userId", userId);
        data.put("bookingId", bookingId);
        data.put("subscriptionId", subscriptionId);
        data.put("type", type);
        data.put("amount", amount);
        data.put("currency", currency);
        data.put("gateway", gateway);
        data.put("gatewayPaymentId", gatewayPaymentId);
        data.put("gatewayOrderId", gatewayOrderId);
        data.put("status", status);
        data.put("createdAt", createdAt);
        data.put("updatedAt", updatedAt);

        return data;
    }
}