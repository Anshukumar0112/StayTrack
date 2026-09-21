package com.staytrack.backend.model;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

public class Area {

    private String areaId;
    private String name;
    private String city;
    private String state;
    private String country;
    private boolean active;
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;

    public String getAreaId() { return areaId; }
    public void setAreaId(String areaId) { this.areaId = areaId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public Map<String, Object> toMap() {
        Map<String, Object> data = new HashMap<>();
        data.put("areaId", areaId);
        data.put("name", name);
        data.put("city", city);
        data.put("state", state);
        data.put("country", country);
        data.put("active", active);
        data.put("createdAt", createdAt);
        data.put("updatedAt", updatedAt);
        data.put("createdBy", createdBy);
        data.put("updatedBy", updatedBy);
        return data;
    }
}
