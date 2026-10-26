package com.staytrack.backend.dto.booking;

public class BookingRequest {

    private String propertyId;
    private String bookingType;
    private String startDate;
    private String endDate;
    private String startTime;
    private String endTime;
    private String guestName;
    private String contactPhone;
    private String inventoryUnitId;
    private String occupancyType;
    private String roomTypeId;
    private String occupancyOptionName;

    public String getInventoryUnitId() {
        return inventoryUnitId;
    }

    public void setInventoryUnitId(String inventoryUnitId) {
        this.inventoryUnitId = inventoryUnitId;
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

    public String getOccupancyOptionName() {
        return occupancyOptionName;
    }

    public void setOccupancyOptionName(String occupancyOptionName) {
        this.occupancyOptionName = occupancyOptionName;
    }

    public String getPropertyId() {
        return propertyId;
    }

    public void setPropertyId(String propertyId) {
        this.propertyId = propertyId;
    }

    public String getBookingType() {
        return bookingType;
    }

    public void setBookingType(String bookingType) {
        this.bookingType = bookingType;
    }

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public String getEndDate() {
        return endDate;
    }

    public void setEndDate(String endDate) {
        this.endDate = endDate;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public String getGuestName() {
        return guestName;
    }

    public void setGuestName(String guestName) {
        this.guestName = guestName;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public void setContactPhone(String contactPhone) {
        this.contactPhone = contactPhone;
    }
}