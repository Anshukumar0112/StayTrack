package com.staytrack.backend.dto.conversation;

public class MessageRequest {

    private String content;
    private String text;

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
}

