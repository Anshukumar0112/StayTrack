package com.staytrack.backend.model;

import java.util.List;

public class Property {

    private String propertyId;
    private String hostId;
    private String hostType;

    private String title;
    private String description;

    private String propertyType;
    private List<String> stayTypes;

    private Double hourlyPrice;
    private Double dailyPrice;
    private Double monthlyPrice;

    private String address;
    private String city;
    private String area;

    private Double latitude;
    private Double longitude;

    private Integer bedrooms;
    private Integer bathrooms;

    private Boolean furnished;

    private Double areaSqFt;

    private List<String> amenities;
    private List<String> images;

    private String verificationStatus;
    private String verificationNote;

    private String listingStatus;

    private Boolean topVerified;
    private Boolean showInStay;

    private Double averageRating;
    private Long reviewCount;

    // Category / Classification
    private String category;

    // BNB attributes
    private String spaceType;
    private Integer maxGuests;
    private Integer bedsCount;
    private String checkInTime;
    private String checkOutTime;
    private List<String> houseRules;

    // PG attributes
    private String occupancyType;
    private String genderCategory;
    private Boolean foodIncluded;
    private List<String> foodOptions;
    private Double securityDeposit;
    private Boolean securityDepositEnabled;
    private Integer noticePeriodDays;
    private String gateClosingTime;
    private String contractDuration;
    private Integer customDurationValue;
    private String customDurationUnit;
    private Double monthlyRentPerBed;
    private List<java.util.Map<String, Object>> occupancyOptions;

    // Hostel attributes
    private String roomType;
    private Integer totalBeds;
    private Integer availableBeds;
    private String priceModel;
    private String studentOrWorking;
    private List<String> sharedFacilities;

    // Flat attributes
    private String bhkConfig;
    private Double maintenanceCharges;
    private String tenantPreference;
    private Integer floorNumber;
    private Integer totalFloors;
    private String parkingType;

    // Hotel attributes
    private String bedType;
    private Boolean breakfastIncluded;
    private String cancellationPolicy;

    public Boolean getTopVerified() {
        return topVerified;
    }

    public void setTopVerified(Boolean topVerified) {
        this.topVerified = topVerified;
    }

    public Boolean getShowInStay() {
        return showInStay;
    }

    public void setShowInStay(Boolean showInStay) {
        this.showInStay = showInStay;
    }

    public String getPropertyId() {
        return propertyId;
    }

    public void setPropertyId(String propertyId) {
        this.propertyId = propertyId;
    }

    public String getHostId() {
        return hostId;
    }

    public void setHostId(String hostId) {
        this.hostId = hostId;
    }

    public String getHostType() {
        return hostType;
    }

    public void setHostType(String hostType) {
        this.hostType = hostType;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPropertyType() {
        return propertyType;
    }

    public void setPropertyType(String propertyType) {
        this.propertyType = propertyType;
    }

    public List<String> getStayTypes() {
        return stayTypes;
    }

    public void setStayTypes(List<String> stayTypes) {
        this.stayTypes = stayTypes;
    }

    public Double getHourlyPrice() {
        return hourlyPrice;
    }

    public void setHourlyPrice(Double hourlyPrice) {
        this.hourlyPrice = hourlyPrice;
    }

    public Double getDailyPrice() {
        return dailyPrice;
    }

    public void setDailyPrice(Double dailyPrice) {
        this.dailyPrice = dailyPrice;
    }

    public Double getMonthlyPrice() {
        return monthlyPrice;
    }

    public void setMonthlyPrice(Double monthlyPrice) {
        this.monthlyPrice = monthlyPrice;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getArea() {
        return area;
    }

    public void setArea(String area) {
        this.area = area;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Integer getBedrooms() {
        return bedrooms;
    }

    public void setBedrooms(Integer bedrooms) {
        this.bedrooms = bedrooms;
    }

    public Integer getBathrooms() {
        return bathrooms;
    }

    public void setBathrooms(Integer bathrooms) {
        this.bathrooms = bathrooms;
    }

    public Boolean getFurnished() {
        return furnished;
    }

    public void setFurnished(Boolean furnished) {
        this.furnished = furnished;
    }

    public Double getAreaSqFt() {
        return areaSqFt;
    }

    public void setAreaSqFt(Double areaSqFt) {
        this.areaSqFt = areaSqFt;
    }

    public List<String> getAmenities() {
        return amenities;
    }

    public void setAmenities(List<String> amenities) {
        this.amenities = amenities;
    }

    public List<String> getImages() {
        return images;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }

    public String getVerificationStatus() {
        return verificationStatus;
    }

    public void setVerificationStatus(String verificationStatus) {
        this.verificationStatus = verificationStatus;
    }

    public String getVerificationNote() {
        return verificationNote;
    }

    public void setVerificationNote(String verificationNote) {
        this.verificationNote = verificationNote;
    }

    public String getListingStatus() {
        return listingStatus;
    }

    public void setListingStatus(String listingStatus) {
        this.listingStatus = listingStatus;
    }

    public Double getAverageRating() {
        return averageRating;
    }

    public void setAverageRating(Double averageRating) {
        this.averageRating = averageRating;
    }

    public Long getReviewCount() {
        return reviewCount;
    }

    public void setReviewCount(Long reviewCount) {
        this.reviewCount = reviewCount;
    }

    public String getCategory() {
        if (category != null && !category.isBlank()) {
            return category;
        }
        return propertyType;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getSpaceType() {
        return spaceType;
    }

    public void setSpaceType(String spaceType) {
        this.spaceType = spaceType;
    }

    public Integer getMaxGuests() {
        return maxGuests;
    }

    public void setMaxGuests(Integer maxGuests) {
        this.maxGuests = maxGuests;
    }

    public Integer getBedsCount() {
        return bedsCount;
    }

    public void setBedsCount(Integer bedsCount) {
        this.bedsCount = bedsCount;
    }

    public String getCheckInTime() {
        return checkInTime;
    }

    public void setCheckInTime(String checkInTime) {
        this.checkInTime = checkInTime;
    }

    public String getCheckOutTime() {
        return checkOutTime;
    }

    public void setCheckOutTime(String checkOutTime) {
        this.checkOutTime = checkOutTime;
    }

    public List<String> getHouseRules() {
        return houseRules;
    }

    public void setHouseRules(List<String> houseRules) {
        this.houseRules = houseRules;
    }

    public String getOccupancyType() {
        return occupancyType;
    }

    public void setOccupancyType(String occupancyType) {
        this.occupancyType = occupancyType;
    }

    public String getGenderCategory() {
        return genderCategory;
    }

    public void setGenderCategory(String genderCategory) {
        this.genderCategory = genderCategory;
    }

    public Boolean getFoodIncluded() {
        return foodIncluded;
    }

    public void setFoodIncluded(Boolean foodIncluded) {
        this.foodIncluded = foodIncluded;
    }

    public List<String> getFoodOptions() {
        return foodOptions;
    }

    public void setFoodOptions(List<String> foodOptions) {
        this.foodOptions = foodOptions;
    }

    public Double getSecurityDeposit() {
        return securityDeposit;
    }

    public void setSecurityDeposit(Double securityDeposit) {
        this.securityDeposit = securityDeposit;
    }

    public Integer getNoticePeriodDays() {
        return noticePeriodDays;
    }

    public void setNoticePeriodDays(Integer noticePeriodDays) {
        this.noticePeriodDays = noticePeriodDays;
    }

    public String getGateClosingTime() {
        return gateClosingTime;
    }

    public void setGateClosingTime(String gateClosingTime) {
        this.gateClosingTime = gateClosingTime;
    }

    public String getRoomType() {
        return roomType;
    }

    public void setRoomType(String roomType) {
        this.roomType = roomType;
    }

    public Integer getTotalBeds() {
        return totalBeds;
    }

    public void setTotalBeds(Integer totalBeds) {
        this.totalBeds = totalBeds;
    }

    public Integer getAvailableBeds() {
        return availableBeds;
    }

    public void setAvailableBeds(Integer availableBeds) {
        this.availableBeds = availableBeds;
    }

    public String getPriceModel() {
        return priceModel;
    }

    public void setPriceModel(String priceModel) {
        this.priceModel = priceModel;
    }

    public String getStudentOrWorking() {
        return studentOrWorking;
    }

    public void setStudentOrWorking(String studentOrWorking) {
        this.studentOrWorking = studentOrWorking;
    }

    public List<String> getSharedFacilities() {
        return sharedFacilities;
    }

    public void setSharedFacilities(List<String> sharedFacilities) {
        this.sharedFacilities = sharedFacilities;
    }

    public String getBhkConfig() {
        return bhkConfig;
    }

    public void setBhkConfig(String bhkConfig) {
        this.bhkConfig = bhkConfig;
    }

    public Double getMaintenanceCharges() {
        return maintenanceCharges;
    }

    public void setMaintenanceCharges(Double maintenanceCharges) {
        this.maintenanceCharges = maintenanceCharges;
    }

    public String getTenantPreference() {
        return tenantPreference;
    }

    public void setTenantPreference(String tenantPreference) {
        this.tenantPreference = tenantPreference;
    }

    public Integer getFloorNumber() {
        return floorNumber;
    }

    public void setFloorNumber(Integer floorNumber) {
        this.floorNumber = floorNumber;
    }

    public Integer getTotalFloors() {
        return totalFloors;
    }

    public void setTotalFloors(Integer totalFloors) {
        this.totalFloors = totalFloors;
    }

    public String getParkingType() {
        return parkingType;
    }

    public void setParkingType(String parkingType) {
        this.parkingType = parkingType;
    }

    public String getBedType() {
        return bedType;
    }

    public void setBedType(String bedType) {
        this.bedType = bedType;
    }

    public Boolean getBreakfastIncluded() {
        return breakfastIncluded;
    }

    public void setBreakfastIncluded(Boolean breakfastIncluded) {
        this.breakfastIncluded = breakfastIncluded;
    }

    public String getCancellationPolicy() {
        return cancellationPolicy;
    }

    public void setCancellationPolicy(String cancellationPolicy) {
        this.cancellationPolicy = cancellationPolicy;
    }

    public String getContractDuration() {
        return contractDuration;
    }

    public void setContractDuration(String contractDuration) {
        this.contractDuration = contractDuration;
    }

    public Integer getCustomDurationValue() {
        return customDurationValue;
    }

    public void setCustomDurationValue(Integer customDurationValue) {
        this.customDurationValue = customDurationValue;
    }

    public String getCustomDurationUnit() {
        return customDurationUnit;
    }

    public void setCustomDurationUnit(String customDurationUnit) {
        this.customDurationUnit = customDurationUnit;
    }

    public Double getMonthlyRentPerBed() {
        return monthlyRentPerBed;
    }

    public void setMonthlyRentPerBed(Double monthlyRentPerBed) {
        this.monthlyRentPerBed = monthlyRentPerBed;
    }

    public Boolean getSecurityDepositEnabled() {
        return securityDepositEnabled;
    }

    public void setSecurityDepositEnabled(Boolean securityDepositEnabled) {
        this.securityDepositEnabled = securityDepositEnabled;
    }

    public List<java.util.Map<String, Object>> getOccupancyOptions() {
        return occupancyOptions;
    }

    public void setOccupancyOptions(List<java.util.Map<String, Object>> occupancyOptions) {
        this.occupancyOptions = occupancyOptions;
    }
}