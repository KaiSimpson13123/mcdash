package net.mcwebdashboard.websocket;

public enum WebSocketTopic {
    STATS("/ws/stats"),
    LOGS("/ws/logs"),
    PLAYERS("/ws/players"),
    ACTIVITY("/ws/activity"),
    LUCKPERMS("/ws/luckperms");

    private final String endpoint;

    WebSocketTopic(String endpoint) {
        this.endpoint = endpoint;
    }

    public String getEndpoint() {
        return endpoint;
    }
}
