package com.staytrack.backend.model;

import com.google.cloud.Timestamp;

public class InventoryUnit {

    private String id;
    private String inventoryUnitId;
    private String propertyId;
    private String unitType; // "bed", "room", "room_type"
    private String unitName;
    private String unitNumber;
    private String parentRoomId; // Optional: set if bed belongs to a room
    private Integer capacity; // Guest capacity
    private Integer totalQuantity; // Default 1 for discrete units, >= 1 for room_type
    private Double price; // Optional pricing override
    private String status; // "active", "inactive"
    private String occupancyType;
    private String roomTypeId;
    private Timestamp createdAt;
    private Timestamp updatedAt;

    public InventoryUnit() {
    }

    public String getId() {
        return id != null ? id : inventoryUnitId;
    }

    public void setId(String id) {
        this.id = id;
        if (this.inventoryUnitId == null) {
            this.inventoryUnitId = id;
        }
    }

    public String getInventoryUnitId() {
        return inventoryUnitId != null ? inventoryUnitId : id;
    }

    public void setInventoryUnitId(String inventoryUnitId) {
        this.inventoryUnitId = inventoryUnitId;
        if (this.id == null) {
            this.id = inventoryUnitId;
        }
    }

    public String getPropertyId() {
        return propertyId;
    }

    public void setPropertyId(String propertyId) {
        this.propertyId = propertyId;
    }

    public String getUnitType() {
        return unitType;
    }

    public void setUnitType(String unitType) {
        this.unitType = unitType;
    }

    public String getUnitName() {
        return unitName;
    }

    public void setUnitName(String unitName) {
        this.unitName = unitName;
    }

    public String getUnitNumber() {
        return unitNumber;
    }

    public void setUnitNumber(String unitNumber) {
        this.unitNumber = unitNumber;
    }

    public String getParentRoomId() {
        return parentRoomId;
    }

    public void setParentRoomId(String parentRoomId) {
        this.parentRoomId = parentRoomId;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }

    public Integer getTotalQuantity() {
        return totalQuantity != null ? totalQuantity : 1;
    }

    public void setTotalQuantity(Integer totalQuantity) {
        this.totalQuantity = totalQuantity;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public String getStatus() {
        return status != null ? status : "active";
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }

    public Timestamp getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Timestamp updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getOccupancyType() {
        return occupancyType;
    }

    public void setOccupancyType(String occupancyType) {
        this.occupancyType = occupancyType;
    }

    public String getRoomTypeId() {
        return roomTypeId;
    }

    public void setRoomTypeId(String roomTypeId) {
        this.roomTypeId = roomTypeId;
    }
}
