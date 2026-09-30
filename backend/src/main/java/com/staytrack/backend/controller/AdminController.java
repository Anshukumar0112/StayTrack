package com.staytrack.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.staytrack.backend.security.AuthenticatedUser;
import com.staytrack.backend.security.SecurityUtils;
import com.staytrack.backend.service.AdminService;
import com.staytrack.backend.service.PaymentAccountVerificationService;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final PaymentAccountVerificationService paymentAccountVerificationService;

    public AdminController(
            AdminService adminService,
            PaymentAccountVerificationService paymentAccountVerificationService) {

        this.adminService = adminService;
        this.paymentAccountVerificationService =
                paymentAccountVerificationService;
    }

    // =========================================================
    // ADMIN DASHBOARD
    // =========================================================

    @GetMapping("/dashboard/summary")
    public ResponseEntity<Map<String, Object>>
    getDashboardSummary() {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.getDashboardSummary(admin)
        );
    }

    // =========================================================
    // USER MANAGEMENT
    // =========================================================

    /**
     * List users for the admin panel.
     *
     * Optional filters:
     * role=customer|host|admin
     * status=active|inactive
     * search=<uid|phone|name|email>
     *
     * page starts at 1 and pageSize defaults to 20.
     */
    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>>
    listUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.listUsersForAdmin(
                        admin,
                        role,
                        status,
                        search,
                        page,
                        pageSize
                )
        );
    }

    /**
     * Get a user profile as an admin.
     */
    @GetMapping("/users/{userId}")
    public ResponseEntity<Map<String, Object>>
    getUser(
            @PathVariable String userId) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.getUserForAdmin(
                        admin,
                        userId
                )
        );
    }

    /**
     * Activate or deactivate a user.
     *
     * The admin cannot change their own account status.
     */
    @PutMapping("/users/{userId}/status")
    public ResponseEntity<Map<String, Object>>
    updateUserStatus(
            @PathVariable String userId,
            @RequestParam String status) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.updateUserStatus(
                        admin,
                        userId,
                        status
                )
        );
    }

    /**
     * Change a user's application role.
     *
     * Role transitions are deliberately restricted by AdminService.
     */
    @PutMapping("/users/{userId}/role")
    public ResponseEntity<Map<String, Object>>
    updateUserRole(
            @PathVariable String userId,
            @RequestParam String role) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.updateUserRole(
                        admin,
                        userId,
                        role
                )
        );
    }

    // =========================================================
    // PROPERTY VERIFICATION
    // =========================================================

    /**
     * List properties for the admin panel.
     *
     * Optional filters:
     * verificationStatus=pending|approved|changes_required|rejected
     * listingStatus=active|hidden|inactive
     * search=<propertyId|hostId|title|city|area>
     *
     * page starts at 1 and pageSize defaults to 20.
     */
    @GetMapping("/properties")
    public ResponseEntity<Map<String, Object>>
    listProperties(
            @RequestParam(required = false)
            String verificationStatus,
            @RequestParam(required = false)
            String listingStatus,
            @RequestParam(required = false)
            String search,
            @RequestParam(defaultValue = "1")
            int page,
            @RequestParam(defaultValue = "20")
            int pageSize) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.listPropertiesForAdmin(
                        admin,
                        verificationStatus,
                        listingStatus,
                        search,
                        page,
                        pageSize
                )
        );
    }

    /**
     * Activate, hide, or deactivate an already-approved property.
     */
    @PutMapping("/properties/{propertyId}/listing-status")
    public ResponseEntity<Map<String, Object>>
    updatePropertyListingStatus(
            @PathVariable String propertyId,
            @RequestParam String listingStatus,
            @RequestParam(required = false) String reason) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.updatePropertyListingStatus(
                        admin,
                        propertyId,
                        listingStatus,
                        reason
                )
        );
    }

    @GetMapping("/properties/pending")
    public ResponseEntity<List<Map<String, Object>>>
    getPendingProperties() {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.getPendingProperties(admin)
        );
    }

    @GetMapping("/properties/{propertyId}")
    public ResponseEntity<Map<String, Object>>
    getProperty(
            @PathVariable String propertyId) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.getPropertyForAdmin(
                        admin,
                        propertyId
                )
        );
    }

    @PutMapping("/properties/{propertyId}/approve")
    public ResponseEntity<Map<String, Object>>
    approveProperty(
            @PathVariable String propertyId,
            @RequestParam(required = false) String note) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.approveProperty(
                        admin,
                        propertyId,
                        note
                )
        );
    }

    @PutMapping("/properties/{propertyId}/request-changes")
    public ResponseEntity<Map<String, Object>>
    requestPropertyChanges(
            @PathVariable String propertyId,
            @RequestParam String note) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.requestPropertyChanges(
                        admin,
                        propertyId,
                        note
                )
        );
    }

    @PutMapping("/properties/{propertyId}/reject")
    public ResponseEntity<Map<String, Object>>
    rejectProperty(
            @PathVariable String propertyId,
            @RequestParam String reason) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.rejectProperty(
                        admin,
                        propertyId,
                        reason
                )
        );
    }

    @PutMapping("/properties/{propertyId}/assignment")
    public ResponseEntity<Map<String, Object>>
    updatePropertyAssignment(
            @PathVariable String propertyId,
            @RequestParam(required = false) Boolean topVerified,
            @RequestParam(required = false) Boolean showInStay) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.updatePropertyAssignment(
                        admin,
                        propertyId,
                        topVerified,
                        showInStay
                )
        );
    }

    // =========================================================
    // HOST APPLICATION VERIFICATION
    // =========================================================

    // =========================================================
    // HOST APPLICATION MANAGEMENT
    // =========================================================

    @GetMapping("/host-applications")
    public ResponseEntity<Map<String, Object>>
    listHostApplications(
            @RequestParam(required = false)
            String verificationStatus,
            @RequestParam(required = false)
            String search,
            @RequestParam(defaultValue = "1")
            int page,
            @RequestParam(defaultValue = "20")
            int pageSize) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.listHostApplicationsForAdmin(
                        admin,
                        verificationStatus,
                        search,
                        page,
                        pageSize
                )
        );
    }

    // =========================================================
    // ADMIN SETTINGS
    // =========================================================

    @GetMapping("/settings/subscription")
    public ResponseEntity<Map<String, Object>>
    getSubscriptionSettings() {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.getSubscriptionSettings(admin)
        );
    }

    @PutMapping("/settings/subscription")
    public ResponseEntity<Map<String, Object>>
    updateSubscriptionSettings(
            @RequestBody Map<String, Object> request) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.updateSubscriptionSettings(
                        admin,
                        request
                )
        );
    }

    @GetMapping("/settings/ai")
    public ResponseEntity<Map<String, Object>>
    getAiSettings() {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.getAiSettings(admin)
        );
    }

    @PutMapping("/settings/ai")
    public ResponseEntity<Map<String, Object>>
    updateAiSettings(
            @RequestBody Map<String, Object> request) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.updateAiSettings(
                        admin,
                        request
                )
        );
    }

    @GetMapping("/host-applications/pending")
    public ResponseEntity<List<Map<String, Object>>>
    getPendingHostApplications() {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.getPendingHostApplications(admin)
        );
    }

    @GetMapping("/host-applications/{applicationId}")
    public ResponseEntity<Map<String, Object>>
    getHostApplication(
            @PathVariable String applicationId) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.getHostApplication(
                        admin,
                        applicationId
                )
        );
    }

    @PutMapping("/host-applications/{applicationId}/approve")
    public ResponseEntity<Map<String, Object>>
    approveHostApplication(
            @PathVariable String applicationId,
            @RequestParam(required = false) String adminNote) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.approveHostApplication(
                        admin,
                        applicationId,
                        adminNote
                )
        );
    }

    @PutMapping("/host-applications/{applicationId}/request-changes")
    public ResponseEntity<Map<String, Object>>
    requestHostApplicationChanges(
            @PathVariable String applicationId,
            @RequestParam String adminNote) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.requestHostApplicationChanges(
                        admin,
                        applicationId,
                        adminNote
                )
        );
    }

    @PutMapping("/host-applications/{applicationId}/reject")
    public ResponseEntity<Map<String, Object>>
    rejectHostApplication(
            @PathVariable String applicationId,
            @RequestParam String rejectionReason) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.rejectHostApplication(
                        admin,
                        applicationId,
                        rejectionReason
                )
        );
    }

    // =========================================================
    // HOST PAYMENT ACCOUNT MANAGEMENT
    // =========================================================

    /**
     * Get the payment-account configuration of a host.
     */
    @GetMapping("/hosts/{hostId}/payment-account")
    public ResponseEntity<Map<String, Object>>
    getHostPaymentAccount(
            @PathVariable String hostId) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.getHostPaymentAccount(
                        admin,
                        hostId
                )
        );
    }

    /**
     * Add or replace a Razorpay Route linked account.
     *
     * The account is always stored as pending
     * until it is verified with Razorpay.
     */
    @PutMapping("/hosts/{hostId}/payment-account")
    public ResponseEntity<Map<String, Object>>
    setHostPaymentAccount(
            @PathVariable String hostId,
            @RequestParam String linkedAccountId,
            @RequestParam String productId) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.setHostPaymentAccount(
                        admin,
                        hostId,
                        linkedAccountId,
                        productId
                )
        );
    }

    /**
     * Verify the host's Razorpay Route payment account.
     *
     * This endpoint checks the linked account and Route product
     * directly with Razorpay and updates the local verification
     * status accordingly.
     */
    @PostMapping("/hosts/{hostId}/payment-account/verify")
    public ResponseEntity<Map<String, Object>>
    verifyHostPaymentAccount(
            @PathVariable String hostId) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                paymentAccountVerificationService
                        .verifyHostPaymentAccount(
                                admin,
                                hostId
                        )
        );
    }

    /**
     * Suspend a host's payment account.
     */
    @PutMapping("/hosts/{hostId}/payment-account/suspend")
    public ResponseEntity<Map<String, Object>>
    suspendHostPaymentAccount(
            @PathVariable String hostId,
            @RequestParam String reason) {

        AuthenticatedUser admin =
                SecurityUtils.getCurrentUser();

        return ResponseEntity.ok(
                adminService.suspendHostPaymentAccount(
                        admin,
                        hostId,
                        reason
                )
        );
    }

    @PutMapping("/hosts/{hostId}/suspend")
    public ResponseEntity<Map<String, Object>> suspendHost(
            @PathVariable String hostId,
            @RequestParam(required = false) String reason) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.suspendHost(admin, hostId, reason));
    }

    @PutMapping("/hosts/{hostId}/ban")
    public ResponseEntity<Map<String, Object>> banHost(
            @PathVariable String hostId,
            @RequestParam(required = false) String reason) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.banHost(admin, hostId, reason));
    }

    @PutMapping("/hosts/{hostId}/reactivate")
    public ResponseEntity<Map<String, Object>> reactivateHost(
            @PathVariable String hostId) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.reactivateHost(admin, hostId));
    }

    @GetMapping("/hosts/{hostId}/subscription")
    public ResponseEntity<Map<String, Object>> getHostSubscription(
            @PathVariable String hostId) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.getHostSubscription(admin, hostId));
    }

    @PostMapping("/hosts/{hostId}/subscription/grant")
    public ResponseEntity<Map<String, Object>> grantHostSubscription(
            @PathVariable String hostId,
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(required = false) String plan,
            @RequestParam(required = false) Long durationDays,
            @RequestParam(required = false) String reason) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        String targetPlan = plan;
        Long targetDuration = durationDays;
        String targetReason = reason;
        if (body != null) {
            if (targetPlan == null && body.get("plan") != null) targetPlan = String.valueOf(body.get("plan"));
            if (targetDuration == null && body.get("durationDays") != null) {
                targetDuration = ((Number) body.get("durationDays")).longValue();
            }
            if (targetReason == null && body.get("reason") != null) targetReason = String.valueOf(body.get("reason"));
        }
        return ResponseEntity.ok(adminService.grantHostSubscription(admin, hostId, targetPlan, targetDuration, targetReason));
    }

    @PutMapping("/hosts/{hostId}/subscription/grant")
    public ResponseEntity<Map<String, Object>> grantHostSubscriptionPut(
            @PathVariable String hostId,
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(required = false) String plan,
            @RequestParam(required = false) Long durationDays,
            @RequestParam(required = false) String reason) {
        return grantHostSubscription(hostId, body, plan, durationDays, reason);
    }

    @PutMapping("/hosts/{hostId}/subscription/pause")
    public ResponseEntity<Map<String, Object>> pauseHostSubscription(
            @PathVariable String hostId) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.pauseHostSubscription(admin, hostId));
    }

    @PostMapping("/hosts/{hostId}/subscription/pause")
    public ResponseEntity<Map<String, Object>> pauseHostSubscriptionPost(
            @PathVariable String hostId) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.pauseHostSubscription(admin, hostId));
    }

    @PutMapping("/hosts/{hostId}/subscription/resume")
    public ResponseEntity<Map<String, Object>> resumeHostSubscription(
            @PathVariable String hostId) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.resumeHostSubscription(admin, hostId));
    }

    @PostMapping("/hosts/{hostId}/subscription/resume")
    public ResponseEntity<Map<String, Object>> resumeHostSubscriptionPost(
            @PathVariable String hostId) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.resumeHostSubscription(admin, hostId));
    }

    @GetMapping("/activities")
    public ResponseEntity<List<Map<String, Object>>> getRecentActivities(
            @RequestParam(defaultValue = "15") int limit) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.getRecentAdminActivities(admin, limit));
    }

    @DeleteMapping("/activities")
    public ResponseEntity<Map<String, Object>> clearActivities() {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.clearAdminActivities(admin));
    }

    @PostMapping("/activities/clear")
    public ResponseEntity<Map<String, Object>> clearActivitiesPost() {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.clearAdminActivities(admin));
    }

    @PostMapping("/activities/delete")
    public ResponseEntity<Map<String, Object>> clearActivitiesDeletePost() {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.clearAdminActivities(admin));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable String userId) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.deleteUser(admin, userId));
    }

    @PostMapping("/users/{userId}/delete")
    public ResponseEntity<Map<String, Object>> deleteUserPost(@PathVariable String userId) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.deleteUser(admin, userId));
    }

    @DeleteMapping("/hosts/{hostId}")
    public ResponseEntity<Map<String, Object>> deleteHost(@PathVariable String hostId) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.deleteHost(admin, hostId));
    }

    @PostMapping("/hosts/{hostId}/delete")
    public ResponseEntity<Map<String, Object>> deleteHostPost(@PathVariable String hostId) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.deleteHost(admin, hostId));
    }

    @PutMapping("/hosts/{hostId}/unban")
    public ResponseEntity<Map<String, Object>> unbanHost(@PathVariable String hostId) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.unbanHost(admin, hostId));
    }

    @PostMapping("/hosts/{hostId}/unban")
    public ResponseEntity<Map<String, Object>> unbanHostPost(@PathVariable String hostId) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.unbanHost(admin, hostId));
    }

    @DeleteMapping("/properties/{propertyId}")
    public ResponseEntity<Map<String, Object>> deleteProperty(
            @PathVariable String propertyId,
            @RequestParam(required = false) String reason) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.deleteProperty(admin, propertyId, reason));
    }

    @PostMapping("/properties/{propertyId}/delete")
    public ResponseEntity<Map<String, Object>> deletePropertyPost(
            @PathVariable String propertyId,
            @RequestParam(required = false) String reason) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.deleteProperty(admin, propertyId, reason));
    }

    @DeleteMapping("/host-applications/{applicationId}")
    public ResponseEntity<Map<String, Object>> deleteHostApplication(@PathVariable String applicationId) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.deleteHostApplication(admin, applicationId));
    }

    @PostMapping("/host-applications/{applicationId}/delete")
    public ResponseEntity<Map<String, Object>> deleteHostApplicationPost(@PathVariable String applicationId) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.deleteHostApplication(admin, applicationId));
    }

    @DeleteMapping("/reviews/{reviewId}")
    public ResponseEntity<Map<String, Object>> deleteReview(@PathVariable String reviewId) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.deleteReview(admin, reviewId));
    }

    @PostMapping("/reviews/{reviewId}/delete")
    public ResponseEntity<Map<String, Object>> deleteReviewPost(@PathVariable String reviewId) {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.deleteReview(admin, reviewId));
    }

    @PostMapping("/properties/migrate-locations")
    public ResponseEntity<Map<String, Object>> migratePropertyLocations() {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.migratePropertyLocationNormalization(admin));
    }

    @PostMapping("/system/clean-test-data")
    public ResponseEntity<Map<String, Object>> cleanTestData() {
        AuthenticatedUser admin = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(adminService.cleanupTestArtifacts(admin));
    }
}
