package com.staytrack.backend.service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.staytrack.backend.dto.conversation.ConversationRequest;
import com.staytrack.backend.dto.conversation.MessageRequest;
import com.staytrack.backend.repository.BookingRepository;
import com.staytrack.backend.repository.ConversationRepository;
import com.staytrack.backend.repository.PropertyRepository;
import com.staytrack.backend.security.AuthenticatedUser;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ConversationService {

    private static final Pattern PHONE_PATTERN =
            Pattern.compile(
                    "(?<!\\d)(?:\\+?\\d[\\d\\s().-]{7,}\\d)(?!\\d)"
            );

    private final ConversationRepository conversationRepository;
    private final PropertyRepository propertyRepository;
    private final BookingRepository bookingRepository;

    public ConversationService(
            ConversationRepository conversationRepository,
            PropertyRepository propertyRepository,
            BookingRepository bookingRepository
    ) {
        this.conversationRepository = conversationRepository;
        this.propertyRepository = propertyRepository;
        this.bookingRepository = bookingRepository;
    }

    public Map<String, Object> createConversation(
            AuthenticatedUser user,
            ConversationRequest request
    ) {
        requireCustomer(user);

        if (request == null
                || request.getPropertyId() == null
                || request.getPropertyId().isBlank()) {
            throw new IllegalArgumentException(
                    "Property ID is required"
            );
        }

        String propertyId =
                request.getPropertyId().trim();

        try {
            DocumentSnapshot property =
                    propertyRepository.findById(propertyId);

            if (!property.exists()) {
                throw new RuntimeException(
                        "Property not found"
                );
            }

            Map<String, Object> propertyData =
                    property.getData();

            if (propertyData == null) {
                throw new RuntimeException(
                        "Property data is empty"
                );
            }

            String verificationStatus =
                    stringValue(
                            propertyData.get(
                                    "verificationStatus"
                            )
                    );

            String listingStatus =
                    stringValue(
                            propertyData.get(
                                    "listingStatus"
                            )
                    );

            if (!"approved".equalsIgnoreCase(
                    verificationStatus
            ) || !"active".equalsIgnoreCase(
                    listingStatus
            )) {
                throw new RuntimeException(
                        "Chat is available only for active approved properties"
                );
            }

            String hostId =
                    stringValue(
                            propertyData.get("hostId")
                    );

            if (hostId.isBlank()) {
                throw new RuntimeException(
                        "Property host is missing"
                );
            }

            if (hostId.equals(user.getUid())) {
                throw new SecurityException(
                        "You cannot start a conversation with yourself"
                );
            }

            String bookingId =
                    request.getBookingId() == null
                            ? ""
                            : request.getBookingId().trim();

            if (!bookingId.isBlank()) {
                validateBookingRelationship(
                        bookingId,
                        propertyId,
                        user.getUid(),
                        hostId
                );
            }

            String conversationId =
                    ConversationRepository.buildConversationId(
                            user.getUid(),
                            hostId,
                            propertyId
                    );

            DocumentSnapshot existing =
                    conversationRepository.findById(
                            conversationId
                    );

            if (existing.exists()) {
                return withId(
                        conversationId,
                        existing.getData()
                );
            }

            Timestamp now = Timestamp.now();

            Map<String, Object> conversation =
                    new HashMap<>();

            conversation.put(
                    "conversationId",
                    conversationId
            );
            conversation.put(
                    "customerId",
                    user.getUid()
            );
            conversation.put(
                    "hostId",
                    hostId
            );
            conversation.put(
                    "propertyId",
                    propertyId
            );
            conversation.put(
                    "bookingId",
                    bookingId
            );
            conversation.put(
                    "lastMessage",
                    ""
            );
            conversation.put(
                    "lastMessageAt",
                    now
            );
            conversation.put(
                    "lastMessageSenderId",
                    ""
            );
            conversation.put(
                    "customerUnreadCount",
                    0L
            );
            conversation.put(
                    "hostUnreadCount",
                    0L
            );
            conversation.put(
                    "createdAt",
                    now
            );
            conversation.put(
                    "updatedAt",
                    now
            );

            try {
                conversationRepository.create(
                        conversationId,
                        conversation
                );
            } catch (RuntimeException e) {
                DocumentSnapshot created =
                        conversationRepository.findById(
                                conversationId
                        );

                if (!created.exists()) {
                    throw e;
                }
            }

            DocumentSnapshot created =
                    conversationRepository.findById(
                            conversationId
                    );

            return withId(
                    conversationId,
                    created.getData()
            );

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to create conversation",
                    e
            );
        }
    }

    public List<Map<String, Object>> getMyConversations(
            AuthenticatedUser user
    ) {
        requireCustomerOrHost(user);

        String field =
                "customer".equalsIgnoreCase(user.getRole())
                        ? "customerId"
                        : "hostId";

        try {
            List<QueryDocumentSnapshot> documents =
                    conversationRepository.findByParticipant(
                            field,
                            user.getUid()
                    );

            List<Map<String, Object>> conversations =
                    new ArrayList<>();

            for (QueryDocumentSnapshot document : documents) {
                Map<String, Object> data =
                        document.getData();

                if (data != null) {
                    conversations.add(
                            withId(
                                    document.getId(),
                                    data
                            )
                    );
                }
            }

            return conversations;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to get conversations",
                    e
            );
        }
    }

    public Map<String, Object> getConversation(
            AuthenticatedUser user,
            String conversationId
    ) {
        requireCustomerOrHost(user);

        if (conversationId == null
                || conversationId.isBlank()) {
            throw new IllegalArgumentException(
                    "Conversation ID is required"
            );
        }

        try {
            DocumentSnapshot conversation =
                    conversationRepository.findById(
                            conversationId
                    );

            if (!conversation.exists()) {
                throw new RuntimeException(
                        "Conversation not found"
                );
            }

            Map<String, Object> data =
                    conversation.getData();

            if (data == null) {
                throw new RuntimeException(
                        "Conversation data is empty"
                );
            }

            requireParticipant(user, data);

            return withId(
                    conversation.getId(),
                    data
            );

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to get conversation",
                    e
            );
        }
    }

    public Map<String, Object> sendMessage(
            AuthenticatedUser user,
            String conversationId,
            MessageRequest request
    ) {
        requireCustomerOrHost(user);

        if (conversationId == null
                || conversationId.isBlank()) {
            throw new IllegalArgumentException(
                    "Conversation ID is required"
            );
        }

        if (request == null
                || request.getContent() == null
                || request.getContent().isBlank()) {
            throw new IllegalArgumentException(
                    "Message content is required"
            );
        }

        String content =
                request.getContent().trim();

        if (content.length() > 5000) {
            throw new IllegalArgumentException(
                    "Message cannot exceed 5000 characters"
            );
        }

        boolean isVisitRequest = "visit_request".equalsIgnoreCase(request.getMessageType())
                || content.startsWith("[SCHEDULED VISIT REQUEST]");

        if (!isVisitRequest) {
            if (PHONE_PATTERN.matcher(content).find()) {
                throw new IllegalArgumentException(
                        "Phone numbers cannot be shared in StayTrack chat"
                );
            }
        } else {
            // For visit inquiries, validate the contact phone number format
            String phoneToCheck = request.getVisitorPhone() != null && !request.getVisitorPhone().isBlank()
                    ? request.getVisitorPhone().trim()
                    : null;

            if (phoneToCheck == null) {
                Matcher matcher = PHONE_PATTERN.matcher(content);
                if (matcher.find()) {
                    phoneToCheck = matcher.group();
                }
            }

            if (phoneToCheck != null) {
                String cleanDigits = phoneToCheck.replaceAll("\\D", "");
                if (cleanDigits.length() < 10 || cleanDigits.length() > 15) {
                    throw new IllegalArgumentException("Invalid phone number format in visit inquiry");
                }
            }
        }

        try {
            DocumentSnapshot conversation =
                    conversationRepository.findById(
                            conversationId
                    );

            if (!conversation.exists()) {
                throw new RuntimeException(
                        "Conversation not found"
                );
            }

            Map<String, Object> conversationData =
                    conversation.getData();

            if (conversationData == null) {
                throw new RuntimeException(
                        "Conversation data is empty"
                );
            }

            requireParticipant(
                    user,
                    conversationData
            );

            if (isVisitRequest) {
                String propId = stringValue(conversationData.get("propertyId"));
                if (!propId.isBlank()) {
                    DocumentSnapshot propDoc = propertyRepository.findById(propId);
                    if (propDoc.exists()) {
                        String cat = stringValue(propDoc.get("category"));
                        if (cat.isBlank()) {
                            cat = stringValue(propDoc.get("propertyType"));
                        }
                        String catUpper = cat.trim().toUpperCase();
                        if ("HOTEL".equals(catUpper) || "BNB".equals(catUpper) || "B&B".equals(catUpper)
                                || "BED_AND_BREAKFAST".equals(catUpper) || "VACATIONSTAY".equals(catUpper)
                                || "VACATION_STAY".equals(catUpper)) {
                            throw new IllegalArgumentException("In-person visits are not available for Hotel and B&B accommodations");
                        }
                    }
                }
            }

            Timestamp now = Timestamp.now();
            String messageId =
                    UUID.randomUUID().toString();

            String senderRole =
                    user.getRole().toLowerCase();

            Map<String, Object> message =
                    new HashMap<>();

            message.put(
                    "messageId",
                    messageId
            );
            message.put(
                    "conversationId",
                    conversationId
            );
            message.put(
                    "senderId",
                    user.getUid()
            );
            message.put(
                    "senderRole",
                    senderRole
            );
            message.put(
                    "content",
                    content
            );
            message.put(
                    "messageType",
                    isVisitRequest ? "visit_request" : "chat"
            );
            if (isVisitRequest && request.getVisitorPhone() != null && !request.getVisitorPhone().isBlank()) {
                message.put("visitorPhone", request.getVisitorPhone().trim());
            }
            message.put(
                    "createdAt",
                    now
            );

            conversationRepository.addMessage(
                    conversationId,
                    messageId,
                    message
            );

            Map<String, Object> updates =
                    new HashMap<>();

            updates.put(
                    "lastMessage",
                    content
            );
            updates.put(
                    "lastMessageAt",
                    now
            );
            updates.put(
                    "lastMessageSenderId",
                    user.getUid()
            );
            updates.put(
                    "updatedAt",
                    now
            );

            if ("customer".equalsIgnoreCase(
                    senderRole
            )) {
                updates.put(
                        "hostUnreadCount",
                        getLongValue(
                                conversationData.get(
                                        "hostUnreadCount"
                                )
                        ) + 1L
                );
            } else {
                updates.put(
                        "customerUnreadCount",
                        getLongValue(
                                conversationData.get(
                                        "customerUnreadCount"
                                )
                        ) + 1L
                );
            }

            conversationRepository.update(
                    conversationId,
                    updates
            );

            return withId(
                    messageId,
                    message
            );

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to send message",
                    e
            );
        }
    }

    public List<Map<String, Object>> getMessages(
            AuthenticatedUser user,
            String conversationId
    ) {
        requireCustomerOrHost(user);

        Map<String, Object> conversation =
                getConversation(
                        user,
                        conversationId
                );

        if (conversation == null) {
            throw new RuntimeException(
                    "Conversation not found"
            );
        }

        try {
            List<QueryDocumentSnapshot> documents =
                    conversationRepository.findMessages(
                            conversationId
                    );

            List<Map<String, Object>> messages =
                    new ArrayList<>();

            for (QueryDocumentSnapshot document : documents) {
                Map<String, Object> data =
                        document.getData();

                if (data != null) {
                    messages.add(
                            withId(
                                    document.getId(),
                                    data
                            )
                    );
                }
            }

            return messages;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to get messages",
                    e
            );
        }
    }

    public Map<String, Object> markAsRead(
            AuthenticatedUser user,
            String conversationId
    ) {
        requireCustomerOrHost(user);

        try {
            DocumentSnapshot conversation =
                    conversationRepository.findById(
                            conversationId
                    );

            if (!conversation.exists()) {
                throw new RuntimeException(
                        "Conversation not found"
                );
            }

            Map<String, Object> data =
                    conversation.getData();

            if (data == null) {
                throw new RuntimeException(
                        "Conversation data is empty"
                );
            }

            requireParticipant(user, data);

            Map<String, Object> updates =
                    new HashMap<>();

            if ("customer".equalsIgnoreCase(
                    user.getRole()
            )) {
                updates.put(
                        "customerUnreadCount",
                        0L
                );
            } else {
                updates.put(
                        "hostUnreadCount",
                        0L
                );
            }

            updates.put(
                    "updatedAt",
                    Timestamp.now()
            );

            conversationRepository.update(
                    conversationId,
                    updates
            );

            DocumentSnapshot updated =
                    conversationRepository.findById(
                            conversationId
                    );

            return withId(
                    conversationId,
                    updated.getData()
            );

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to mark conversation as read",
                    e
            );
        }
    }

    private void validateBookingRelationship(
            String bookingId,
            String propertyId,
            String customerId,
            String hostId
    ) {
        try {
            DocumentSnapshot booking =
                    bookingRepository.findById(bookingId);

            if (!booking.exists()) {
                throw new RuntimeException(
                        "Booking not found"
                );
            }

            Map<String, Object> data =
                    booking.getData();

            if (data == null) {
                throw new RuntimeException(
                        "Booking data is empty"
                );
            }

            if (!customerId.equals(
                    stringValue(data.get("customerId"))
            ) || !hostId.equals(
                    stringValue(data.get("hostId"))
            ) || !propertyId.equals(
                    stringValue(data.get("propertyId"))
            )) {
                throw new SecurityException(
                        "Booking does not belong to this conversation"
                );
            }

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(
                    "Unable to validate booking relationship",
                    e
            );
        }
    }

    private void requireParticipant(
            AuthenticatedUser user,
            Map<String, Object> data
    ) {
        String customerId =
                stringValue(data.get("customerId"));

        String hostId =
                stringValue(data.get("hostId"));

        boolean participant =
                user.getUid().equals(customerId)
                        || user.getUid().equals(hostId);

        if (!participant) {
            throw new SecurityException(
                    "You are not a participant in this conversation"
            );
        }
    }

    private void requireCustomer(
            AuthenticatedUser user
    ) {
        if (user == null
                || !"customer".equalsIgnoreCase(
                user.getRole()
        )) {
            throw new SecurityException(
                    "Customer access required"
            );
        }
    }

    private void requireCustomerOrHost(
            AuthenticatedUser user
    ) {
        if (user == null
                || user.getUid() == null
                || user.getUid().isBlank()
                || (!"customer".equalsIgnoreCase(
                user.getRole()
        ) && !"host".equalsIgnoreCase(
                user.getRole()
        ))) {
            throw new SecurityException(
                    "Customer or host access required"
            );
        }
    }

    private long getLongValue(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }

        try {
            return Long.parseLong(
                    String.valueOf(value)
            );
        } catch (Exception e) {
            return 0L;
        }
    }

    private String stringValue(Object value) {
        return value == null
                ? ""
                : String.valueOf(value).trim();
    }

    private Map<String, Object> withId(
            String id,
            Map<String, Object> source
    ) {
        Map<String, Object> result =
                new HashMap<>();

        if (source != null) {
            result.putAll(source);
        }

        if (source != null
                && source.containsKey("messageId")) {
            result.put(
                    "messageId",
                    id
            );
            result.put(
                    "id",
                    id
            );
        } else {
            result.put(
                    "conversationId",
                    id
            );
            result.put(
                    "id",
                    id
            );
        }

        return result;
    }
}
