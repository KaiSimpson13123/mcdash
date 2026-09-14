package net.mcwebdashboard.luckperms;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MiniMessageParser {
    public static class FormattedToken {
        private String text;
        private String color;
        private boolean bold;
        private boolean italic;
        private boolean underlined;
        private boolean strikethrough;

        public FormattedToken(String text, String color, boolean bold, boolean italic, boolean underlined, boolean strikethrough) {
            this.text = text;
            this.color = color;
            this.bold = bold;
            this.italic = italic;
            this.underlined = underlined;
            this.strikethrough = strikethrough;
        }

        public String getText() {
            return text;
        }

        public String getColor() {
            return color;
        }

        public boolean isBold() {
            return bold;
        }

        public boolean isItalic() {
            return italic;
        }

        public boolean isUnderlined() {
            return underlined;
        }

        public boolean isStrikethrough() {
            return strikethrough;
        }
    }

    private static final Map<Character, String> LEGACY_COLORS = Map.ofEntries(
            Map.entry('0', "#000000"),
            Map.entry('1', "#0000AA"),
            Map.entry('2', "#00AA00"),
            Map.entry('3', "#00AAAA"),
            Map.entry('4', "#AA0000"),
            Map.entry('5', "#AA00AA"),
            Map.entry('6', "#FFAA00"),
            Map.entry('7', "#AAAAAA"),
            Map.entry('8', "#555555"),
            Map.entry('9', "#5555FF"),
            Map.entry('a', "#55FF55"),
            Map.entry('b', "#55FFFF"),
            Map.entry('c', "#FF5555"),
            Map.entry('d', "#FF55FF"),
            Map.entry('e', "#FFFF55"),
            Map.entry('f', "#FFFFFF")
    );

    private static final Pattern HEX_PATTERN = Pattern.compile("&#([0-9a-fA-F]{6})|<#([0-9a-fA-F]{6})>");
    private static final Pattern GRADIENT_PATTERN = Pattern.compile("<gradient:([#0-9a-fA-F:]+)>(.*?)</gradient>");

    public static List<FormattedToken> parse(String input) {
        List<FormattedToken> tokens = new ArrayList<>();
        if (input == null || input.isEmpty()) {
            return tokens;
        }

        // Handle simple gradient extraction
        Matcher gradMatcher = GRADIENT_PATTERN.matcher(input);
        if (gradMatcher.find()) {
            String colorsStr = gradMatcher.group(1);
            String content = gradMatcher.group(2);
            String[] hexColors = colorsStr.split(":");
            String startColor = hexColors.length > 0 ? hexColors[0] : "#ffffff";
            tokens.add(new FormattedToken(content, startColor, false, false, false, false));
            return tokens;
        }

        // Standard legacy & hex parsing
        String text = input;
        String currentColor = "#ffffff";
        boolean bold = false;
        boolean italic = false;
        boolean underlined = false;
        boolean strikethrough = false;

        StringBuilder buffer = new StringBuilder();
        int i = 0;
        int len = text.length();

        while (i < len) {
            char c = text.charAt(i);

            // Handle legacy & or §
            if ((c == '&' || c == '§') && i + 1 < len) {
                char code = Character.toLowerCase(text.charAt(i + 1));
                if (code == '#' && i + 7 < len) {
                    // &#RRGGBB
                    if (buffer.length() > 0) {
                        tokens.add(new FormattedToken(buffer.toString(), currentColor, bold, italic, underlined, strikethrough));
                        buffer.setLength(0);
                    }
                    currentColor = "#" + text.substring(i + 2, i + 8);
                    i += 8;
                    continue;
                }

                if (LEGACY_COLORS.containsKey(code)) {
                    if (buffer.length() > 0) {
                        tokens.add(new FormattedToken(buffer.toString(), currentColor, bold, italic, underlined, strikethrough));
                        buffer.setLength(0);
                    }
                    currentColor = LEGACY_COLORS.get(code);
                    bold = false;
                    italic = false;
                    underlined = false;
                    strikethrough = false;
                    i += 2;
                    continue;
                } else if (code == 'l') {
                    bold = true;
                    i += 2;
                    continue;
                } else if (code == 'o') {
                    italic = true;
                    i += 2;
                    continue;
                } else if (code == 'n') {
                    underlined = true;
                    i += 2;
                    continue;
                } else if (code == 'm') {
                    strikethrough = true;
                    i += 2;
                    continue;
                } else if (code == 'r') {
                    if (buffer.length() > 0) {
                        tokens.add(new FormattedToken(buffer.toString(), currentColor, bold, italic, underlined, strikethrough));
                        buffer.setLength(0);
                    }
                    currentColor = "#ffffff";
                    bold = false;
                    italic = false;
                    underlined = false;
                    strikethrough = false;
                    i += 2;
                    continue;
                }
            }

            buffer.append(c);
            i++;
        }

        if (buffer.length() > 0) {
            tokens.add(new FormattedToken(buffer.toString(), currentColor, bold, italic, underlined, strikethrough));
        }

        return tokens;
    }

    public static String stripFormatting(String input) {
        if (input == null) return "";
        return input.replaceAll("[&§][0-9a-fk-orA-FK-OR]", "")
                .replaceAll("&#[0-9a-fA-F]{6}", "")
                .replaceAll("<[^>]*>", "");
    }
}
