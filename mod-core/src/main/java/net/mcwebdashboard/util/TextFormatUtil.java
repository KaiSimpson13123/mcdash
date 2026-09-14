package net.mcwebdashboard.util;

import net.minecraft.network.chat.Component;

public final class TextFormatUtil {
    private TextFormatUtil() {
    }

    public static String toPlainText(Component component) {
        if (component == null) {
            return "";
        }
        return component.getString();
    }
}
