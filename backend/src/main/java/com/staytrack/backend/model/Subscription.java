package com.staytrack.backend.model;

import java.util.Map;

public class Subscription {

    private String subscriptionId;
    private String hostId;
    private String plan;
    private long amount;
    private String currency;
    private String status;
    private Object startDate;
    private Object endDate;
    private Object createdAt;

    public Subscription() {
    }

    public Subscription(
            String subscriptionId,
            String hostId,
            String plan,
            long amount,
            String currency,
            String status,
            Object startDate,
            Object endDate,
            Object createdAt) {

        this.subscriptionId = subscriptionId;
        this.hostId = hostId;
        this.plan = plan;
        this.amount = amount;
        this.currency = currency;
        this.status = status;
        this.startDate = startDate;
        this.endDate = endDate;
        this.createdAt = createdAt;
    }

    public String getSubscriptionId() {
        return subscriptionId;
    }

    public void setSubscriptionId(String subscriptionId) {
        this.subscriptionId = subscriptionId;
    }

    public String getHostId() {
        return hostId;
    }

    public void setHostId(String hostId) {
        this.hostId = hostId;
    }

    public String getPlan() {
        return plan;
    }

    public void setPlan(String plan) {
        this.plan = plan;
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

    public Object getStartDate() {
        return startDate;
    }

    public void setStartDate(Object startDate) {
        this.startDate = startDate;
    }

    public Object getEndDate() {
        return endDate;
    }

    public void setEndDate(Object endDate) {
        this.endDate = endDate;
    }

    public Object getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Object createdAt) {
        this.createdAt = createdAt;
    }

    public Map<String, Object> toMap() {
        return Map.of(
                "subscriptionId", subscriptionId,
                "hostId", hostId,
                "plan", plan,
                "amount", amount,
                "currency", currency,
                "status", status,
                "startDate", startDate,
                "endDate", endDate,
                "createdAt", createdAt
        );
    }
}