package net.mcwebdashboard.api;

import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import io.javalin.http.UploadedFile;
import net.mcwebdashboard.services.ActivityTrackerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.util.*;
import java.util.stream.Stream;

public class FileController {
    private static final Logger LOGGER = LoggerFactory.getLogger("MC-WebDashboard/Files");
    private final ActivityTrackerService activityTrackerService;
    private final Path serverRoot;

    public FileController(ActivityTrackerService activityTrackerService) {
        this.activityTrackerService = activityTrackerService;
        Path root;
        try {
            root = new File(".").getCanonicalFile().toPath();
        } catch (IOException e) {
            root = Paths.get(".").toAbsolutePath().normalize();
        }
        this.serverRoot = root;
    }

    public void registerRoutes(Javalin app) {
        // Read operations (Admin & Sudo)
        app.get("/api/files/list", this::handleListFiles);
        app.get("/api/files/read", this::handleReadFile);
        app.get("/api/files/download", this::handleDownloadFile);

        // Write operations (Privileged to Sudo only)
        app.post("/api/files/save", this::handleSaveFile);
        app.post("/api/files/upload", this::handleUploadFile);
        app.post("/api/files/delete", this::handleDeleteFile);
        app.post("/api/files/create", this::handleCreateFile);
        app.post("/api/files/rename", this::handleRenameFile);
    }

    private boolean checkSudo(Context ctx) {
        String username = ctx.attribute("username");
        if (username == null || !"sudo".equalsIgnoreCase(username.trim())) {
            ctx.status(HttpStatus.FORBIDDEN).json(Map.of(
                    "error", "permission_denied",
                    "message", "Permission denied: Modifying server files requires 'sudo' privileges. Admin has read-only access."
            ));
            return false;
        }
        return true;
    }

    private Path resolveSafePath(String requestedPath) {
        if (requestedPath == null || requestedPath.trim().isEmpty() || requestedPath.equals("/") || requestedPath.equals(".")) {
            return serverRoot;
        }

        // Strip leading slash or backslash
        String clean = requestedPath.trim().replace('\\', '/');
        while (clean.startsWith("/")) {
            clean = clean.substring(1);
        }

        Path resolved = serverRoot.resolve(clean).normalize();
        if (!resolved.startsWith(serverRoot)) {
            return null; // Path traversal detected
        }
        return resolved;
    }

    private String getRelativePathString(Path path) {
        if (path.equals(serverRoot)) {
            return "";
        }
        return serverRoot.relativize(path).toString().replace('\\', '/');
    }

    private void handleListFiles(Context ctx) {
        String reqPath = ctx.queryParam("path");
        Path targetDir = resolveSafePath(reqPath);
        if (targetDir == null || !Files.exists(targetDir)) {
            ctx.status(HttpStatus.NOT_FOUND).json(Map.of(
                    "error", "path_not_found",
                    "message", "Requested directory not found."
            ));
            return;
        }

        if (!Files.isDirectory(targetDir)) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of(
                    "error", "not_a_directory",
                    "message", "Requested path is not a directory."
            ));
            return;
        }

        String username = ctx.attribute("username");
        boolean isSudo = username != null && "sudo".equalsIgnoreCase(username.trim());

        List<Map<String, Object>> items = new ArrayList<>();
        try (Stream<Path> stream = Files.list(targetDir)) {
            stream.forEach(p -> {
                try {
                    String name = p.getFileName().toString();
                    // Hide git and internal lock files for cleaner display
                    if (name.equals(".git") || name.endsWith(".lock")) {
                        return;
                    }

                    BasicFileAttributes attrs = Files.readAttributes(p, BasicFileAttributes.class);
                    boolean isDir = attrs.isDirectory();
                    long size = isDir ? 0L : attrs.size();
                    String lastModified = attrs.lastModifiedTime().toInstant().toString();

                    int dotIndex = name.lastIndexOf('.');
                    String extension = (dotIndex > 0 && dotIndex < name.length() - 1) ? name.substring(dotIndex + 1).toLowerCase() : "";

                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("name", name);
                    item.put("path", getRelativePathString(p));
                    item.put("isDirectory", isDir);
                    item.put("size", size);
                    item.put("lastModified", lastModified);
                    item.put("extension", extension);
                    items.add(item);
                } catch (Exception e) {
                    LOGGER.warn("Failed to read file attribute for: {}", p, e);
                }
            });
        } catch (IOException e) {
            LOGGER.error("Failed to list directory: {}", targetDir, e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR).json(Map.of("error", "list_failed", "message", e.getMessage()));
            return;
        }

        // Sort: directories first alphabetically, then files alphabetically
        items.sort((a, b) -> {
            boolean aDir = (boolean) a.get("isDirectory");
            boolean bDir = (boolean) b.get("isDirectory");
            if (aDir && !bDir) return -1;
            if (!aDir && bDir) return 1;
            String aName = (String) a.get("name");
            String bName = (String) b.get("name");
            return aName.compareToIgnoreCase(bName);
        });

        String currentRel = getRelativePathString(targetDir);
        String parentRel = null;
        if (!targetDir.equals(serverRoot)) {
            Path parent = targetDir.getParent();
            if (parent != null && parent.startsWith(serverRoot)) {
                parentRel = getRelativePathString(parent);
            } else {
                parentRel = "";
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("currentPath", currentRel);
        response.put("parentPath", parentRel);
        response.put("canWrite", isSudo);
        response.put("items", items);
        ctx.json(response);
    }

    private void handleReadFile(Context ctx) {
        String reqPath = ctx.queryParam("path");
        Path target = resolveSafePath(reqPath);
        if (target == null || !Files.exists(target) || Files.isDirectory(target)) {
            ctx.status(HttpStatus.NOT_FOUND).json(Map.of("error", "file_not_found"));
            return;
        }

        try {
            long size = Files.size(target);
            // Limit text editing to 5MB to avoid browser lag
            if (size > 5 * 1024 * 1024) {
                ctx.status(413).json(Map.of(
                        "error", "file_too_large",
                        "message", "File is too large for online viewer/editor (exceeds 5MB). Use download instead."
                ));
                return;
            }

            String content = Files.readString(target, StandardCharsets.UTF_8);
            String username = ctx.attribute("username");
            boolean isSudo = username != null && "sudo".equalsIgnoreCase(username.trim());

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("name", target.getFileName().toString());
            response.put("path", getRelativePathString(target));
            response.put("content", content);
            response.put("size", size);
            response.put("lastModified", Files.getLastModifiedTime(target).toInstant().toString());
            response.put("canWrite", isSudo);
            ctx.json(response);
        } catch (Exception e) {
            LOGGER.error("Failed to read file: {}", target, e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR).json(Map.of("error", "read_failed", "message", e.getMessage()));
        }
    }

    private void handleDownloadFile(Context ctx) {
        String reqPath = ctx.queryParam("path");
        Path target = resolveSafePath(reqPath);
        if (target == null || !Files.exists(target) || Files.isDirectory(target)) {
            ctx.status(HttpStatus.NOT_FOUND).json(Map.of("error", "file_not_found"));
            return;
        }

        try {
            String fileName = target.getFileName().toString();
            ctx.header("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
            ctx.header("Content-Type", "application/octet-stream");
            ctx.result(Files.newInputStream(target));
        } catch (Exception e) {
            LOGGER.error("Failed to download file: {}", target, e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR).json(Map.of("error", "download_failed"));
        }
    }

    private void handleSaveFile(Context ctx) {
        if (!checkSudo(ctx)) return;

        Map<String, String> body = ctx.bodyAsClass(Map.class);
        String reqPath = body.get("path");
        String content = body.get("content");

        if (reqPath == null || content == null) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "missing_arguments"));
            return;
        }

        Path target = resolveSafePath(reqPath);
        if (target == null || Files.isDirectory(target)) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "invalid_path"));
            return;
        }

        try {
            Files.writeString(target, content, StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            String rel = getRelativePathString(target);
            String username = ctx.attribute("username");
            if (activityTrackerService != null) {
                activityTrackerService.recordEvent("FILE_ACTION", "File Saved", username + " modified: " + rel);
            }
            ctx.json(Map.of("success", true, "message", "File saved successfully.", "path", rel));
        } catch (Exception e) {
            LOGGER.error("Failed to write to file: {}", target, e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR).json(Map.of("error", "save_failed", "message", e.getMessage()));
        }
    }

    private void handleUploadFile(Context ctx) {
        if (!checkSudo(ctx)) return;

        UploadedFile file = ctx.uploadedFile("file");
        String dirPath = ctx.formParam("path");

        if (file == null) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "no_file_uploaded"));
            return;
        }

        Path targetDir = resolveSafePath(dirPath);
        if (targetDir == null || !Files.isDirectory(targetDir)) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "invalid_directory"));
            return;
        }

        String fileName = Paths.get(file.filename()).getFileName().toString();
        Path targetFile = targetDir.resolve(fileName).normalize();
        if (!targetFile.startsWith(serverRoot)) {
            ctx.status(HttpStatus.FORBIDDEN).json(Map.of("error", "path_traversal"));
            return;
        }

        try (InputStream in = file.content()) {
            Files.copy(in, targetFile, StandardCopyOption.REPLACE_EXISTING);
            String rel = getRelativePathString(targetFile);
            String username = ctx.attribute("username");
            if (activityTrackerService != null) {
                activityTrackerService.recordEvent("FILE_ACTION", "File Uploaded", username + " uploaded: " + rel);
            }
            ctx.json(Map.of("success", true, "message", "File uploaded successfully.", "name", fileName, "path", rel));
        } catch (Exception e) {
            LOGGER.error("Failed to save uploaded file: {}", targetFile, e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR).json(Map.of("error", "upload_failed", "message", e.getMessage()));
        }
    }

    private void handleDeleteFile(Context ctx) {
        if (!checkSudo(ctx)) return;

        Map<String, String> body = ctx.bodyAsClass(Map.class);
        String reqPath = body.get("path");
        Path target = resolveSafePath(reqPath);

        if (target == null || target.equals(serverRoot)) {
            ctx.status(HttpStatus.FORBIDDEN).json(Map.of("error", "cannot_delete_root", "message", "Cannot delete the server root directory."));
            return;
        }

        if (!Files.exists(target)) {
            ctx.status(HttpStatus.NOT_FOUND).json(Map.of("error", "file_not_found"));
            return;
        }

        try {
            String rel = getRelativePathString(target);
            if (Files.isDirectory(target)) {
                // Delete directory contents recursively
                try (Stream<Path> walk = Files.walk(target)) {
                    walk.sorted(Comparator.reverseOrder()).forEach(p -> {
                        try {
                            Files.delete(p);
                        } catch (IOException e) {
                            LOGGER.warn("Failed to delete item: {}", p, e);
                        }
                    });
                }
            } else {
                Files.delete(target);
            }

            String username = ctx.attribute("username");
            if (activityTrackerService != null) {
                activityTrackerService.recordEvent("FILE_ACTION", "File Deleted", username + " deleted: " + rel);
            }
            ctx.json(Map.of("success", true, "message", "Deleted successfully.", "path", rel));
        } catch (Exception e) {
            LOGGER.error("Failed to delete: {}", target, e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR).json(Map.of("error", "delete_failed", "message", e.getMessage()));
        }
    }

    private void handleCreateFile(Context ctx) {
        if (!checkSudo(ctx)) return;

        Map<String, Object> body = ctx.bodyAsClass(Map.class);
        String dirPath = (String) body.get("path");
        String name = (String) body.get("name");
        boolean isDirectory = Boolean.TRUE.equals(body.get("isDirectory"));

        if (name == null || name.trim().isEmpty()) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "missing_name"));
            return;
        }

        String cleanName = name.trim();
        if (cleanName.contains("/") || cleanName.contains("\\") || cleanName.equals("..")) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "invalid_name"));
            return;
        }

        Path targetDir = resolveSafePath(dirPath);
        if (targetDir == null || !Files.isDirectory(targetDir)) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "invalid_directory"));
            return;
        }

        Path newTarget = targetDir.resolve(cleanName).normalize();
        if (!newTarget.startsWith(serverRoot)) {
            ctx.status(HttpStatus.FORBIDDEN).json(Map.of("error", "path_traversal"));
            return;
        }

        if (Files.exists(newTarget)) {
            ctx.status(HttpStatus.CONFLICT).json(Map.of("error", "already_exists", "message", "A file or folder with this name already exists."));
            return;
        }

        try {
            if (isDirectory) {
                Files.createDirectories(newTarget);
            } else {
                Files.createFile(newTarget);
            }

            String rel = getRelativePathString(newTarget);
            String username = ctx.attribute("username");
            if (activityTrackerService != null) {
                activityTrackerService.recordEvent("FILE_ACTION", "Created " + (isDirectory ? "Folder" : "File"), username + " created: " + rel);
            }
            ctx.json(Map.of("success", true, "message", "Created successfully.", "path", rel));
        } catch (Exception e) {
            LOGGER.error("Failed to create file/folder: {}", newTarget, e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR).json(Map.of("error", "create_failed", "message", e.getMessage()));
        }
    }

    private void handleRenameFile(Context ctx) {
        if (!checkSudo(ctx)) return;

        Map<String, String> body = ctx.bodyAsClass(Map.class);
        String reqPath = body.get("path");
        String newName = body.get("newName");

        if (reqPath == null || newName == null || newName.trim().isEmpty()) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "missing_arguments"));
            return;
        }

        String cleanNewName = newName.trim();
        if (cleanNewName.contains("/") || cleanNewName.contains("\\") || cleanNewName.equals("..")) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "invalid_name"));
            return;
        }

        Path target = resolveSafePath(reqPath);
        if (target == null || target.equals(serverRoot) || !Files.exists(target)) {
            ctx.status(HttpStatus.NOT_FOUND).json(Map.of("error", "file_not_found"));
            return;
        }

        Path parent = target.getParent();
        if (parent == null) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "cannot_rename_root"));
            return;
        }

        Path destination = parent.resolve(cleanNewName).normalize();
        if (!destination.startsWith(serverRoot)) {
            ctx.status(HttpStatus.FORBIDDEN).json(Map.of("error", "path_traversal"));
            return;
        }

        if (Files.exists(destination)) {
            ctx.status(HttpStatus.CONFLICT).json(Map.of("error", "already_exists", "message", "A file with that name already exists."));
            return;
        }

        try {
            Files.move(target, destination);
            String oldRel = getRelativePathString(target);
            String newRel = getRelativePathString(destination);
            String username = ctx.attribute("username");
            if (activityTrackerService != null) {
                activityTrackerService.recordEvent("FILE_ACTION", "File Renamed", username + " renamed " + oldRel + " to " + cleanNewName);
            }
            ctx.json(Map.of("success", true, "message", "Renamed successfully.", "path", newRel));
        } catch (Exception e) {
            LOGGER.error("Failed to rename: {}", target, e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR).json(Map.of("error", "rename_failed", "message", e.getMessage()));
        }
    }
}
