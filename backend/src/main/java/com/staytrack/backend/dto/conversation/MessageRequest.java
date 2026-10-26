package com.staytrack.backend.dto.conversation;

public class MessageRequest {

    private String content;
    private String text;
    private String messageType;
    private String visitorPhone;

    public String getContent() {
        return content != null && !content.isBlank() ? content : text;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getMessageType() {
        return messageType;
    }

    public void setMessageType(String messageType) {
        this.messageType = messageType;
    }

    public String getVisitorPhone() {
        return visitorPhone;
    }

    public void setVisitorPhone(String visitorPhone) {
        this.visitorPhone = visitorPhone;
    }
}

