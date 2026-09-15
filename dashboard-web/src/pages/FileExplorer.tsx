import React, { useEffect, useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileText,
  Package,
  Image as ImageIcon,
  Download,
  Trash2,
  Edit3,
  Plus,
  Upload,
  RefreshCw,
  CornerLeftUp,
  Search,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Save,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Skeleton } from '../components/Skeleton';
import { ConfirmModal } from '../components/ConfirmModal';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: string;
  extension: string;
}

export const FileExplorer: React.FC = () => {
  const { isSudo } = useAuth();
  const { addToast } = useToast();

  const [currentPath, setCurrentPath] = useState<string>('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // File Viewer / Editor State
  const [editorFile, setEditorFile] = useState<{
    name: string;
    path: string;
    content: string;
    size: number;
    canWrite: boolean;
  } | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorLoading, setEditorLoading] = useState(false);
  const [savingFile, setSavingFile] = useState(false);

  // Upload State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createIsDir, setCreateIsDir] = useState(false);
  const [creating, setCreating] = useState(false);

  // Rename Modal State
  const [renameItem, setRenameItem] = useState<FileItem | null>(null);
  const [renameNewName, setRenameNewName] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Delete Confirm State
  const [deleteItem, setDeleteItem] = useState<FileItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    try {
      const res = await api.listFiles(path);
      setCurrentPath(res.currentPath || '');
      setParentPath(res.parentPath !== undefined ? res.parentPath : null);
      setItems(res.items || []);
    } catch (e: any) {
      addToast('error', e.message || 'Failed to list directory contents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath]);

  const handleOpenFile = async (item: FileItem) => {
    if (item.isDirectory) {
      setCurrentPath(item.path);
      return;
    }

    setEditorLoading(true);
    try {
      const res = await api.readFile(item.path);
      setEditorFile(res);
      setEditorContent(res.content);
    } catch (e: any) {
      addToast('error', e.message || 'Failed to open file for viewing');
    } finally {
      setEditorLoading(false);
    }
  };

  const handleSaveEditor = async () => {
    if (!editorFile) return;
    if (!isSudo) {
      addToast('error', 'Modifying server files requires sudo privileges');
      return;
    }

    setSavingFile(true);
    try {
      await api.saveFile(editorFile.path, editorContent);
      addToast('success', `Saved ${editorFile.name} successfully!`);
      // Update editor file size estimate
      setEditorFile((prev) => (prev ? { ...prev, content: editorContent } : null));
      loadDirectory(currentPath);
    } catch (e: any) {
      addToast('error', e.message || 'Failed to save changes');
    } finally {
      setSavingFile(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    if (!isSudo) {
      addToast('error', 'Uploading files requires sudo privileges');
      return;
    }

    setUploading(true);
    try {
      await api.uploadFile(currentPath, uploadFile);
      addToast('success', `Uploaded ${uploadFile.name} successfully!`);
      setUploadModalOpen(false);
      setUploadFile(null);
      loadDirectory(currentPath);
    } catch (e: any) {
      addToast('error', e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = createName.trim();
    if (!clean) return;
    if (!isSudo) {
      addToast('error', 'Creating files or folders requires sudo privileges');
      return;
    }

    setCreating(true);
    try {
      await api.createFileOrDir({
        path: currentPath,
        name: clean,
        isDirectory: createIsDir,
      });
      addToast('success', `Created ${createIsDir ? 'directory' : 'file'} ${clean}!`);
      setCreateModalOpen(false);
      setCreateName('');
      loadDirectory(currentPath);
    } catch (e: any) {
      addToast('error', e.message || 'Creation failed');
    } finally {
      setCreating(false);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameItem) return;
    const clean = renameNewName.trim();
    if (!clean) return;
    if (!isSudo) {
      addToast('error', 'Renaming items requires sudo privileges');
      return;
    }

    setRenaming(true);
    try {
      await api.renameFile({
        path: renameItem.path,
        newName: clean,
      });
      addToast('success', `Renamed to ${clean}!`);
      setRenameItem(null);
      setRenameNewName('');
      loadDirectory(currentPath);
    } catch (e: any) {
      addToast('error', e.message || 'Rename failed');
    } finally {
      setRenaming(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    if (!isSudo) {
      addToast('error', 'Deleting files or folders requires sudo privileges');
      return;
    }

    setDeleting(true);
    try {
      await api.deleteFile(deleteItem.path);
      addToast('success', `Deleted ${deleteItem.name}!`);
      setDeleteItem(null);
      loadDirectory(currentPath);
    } catch (e: any) {
      addToast('error', e.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (item: FileItem) => {
    if (item.isDirectory) {
      return <Folder className="w-4 h-4 text-[#ffaa00] flex-shrink-0" />;
    }
    const ext = item.extension.toLowerCase();
    if (['json', 'yml', 'yaml', 'properties', 'toml', 'xml', 'conf'].includes(ext)) {
      return <FileCode className="w-4 h-4 text-[#55ffff] flex-shrink-0" />;
    }
    if (['jar', 'zip', 'tar', 'gz'].includes(ext)) {
      return <Package className="w-4 h-4 text-[#ff55ff] flex-shrink-0" />;
    }
    if (['log', 'txt', 'md'].includes(ext)) {
      return <FileText className="w-4 h-4 text-[#aaaaaa] flex-shrink-0" />;
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-[#55ff55] flex-shrink-0" />;
    }
    return <File className="w-4 h-4 text-[#888888] flex-shrink-0" />;
  };

  // Breadcrumbs generator
  const breadcrumbs = useMemo(() => {
    if (!currentPath) return [{ name: 'Server Root', path: '' }];
    const parts = currentPath.split('/').filter(Boolean);
    const crumbs = [{ name: 'Server Root', path: '' }];
    let accum = '';
    for (const part of parts) {
      accum = accum ? `${accum}/${part}` : part;
      crumbs.push({ name: part, path: accum });
    }
    return crumbs;
  }, [currentPath]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    return items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  return (
    <div className="space-y-6 select-none animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#2e2f30] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading tracking-wide text-white flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-[#ffaa00]" />
              SERVER FILE EXPLORER
            </h1>
            <span
              className={`px-2 py-0.5 text-[10px] font-heading uppercase border flex items-center gap-1 ${
                isSudo
                  ? 'bg-[#1e3816] text-[#55ff55] border-[#11240c]'
                  : 'bg-[#152336] text-[#55ffff] border-[#0f2d4a]'
              }`}
            >
              {isSudo ? <Unlock className="w-3 h-3 text-[#55ff55]" /> : <Lock className="w-3 h-3 text-[#55ffff]" />}
              {isSudo ? 'SUDO ACCESS (READ & WRITE)' : 'ADMIN ACCESS (READ-ONLY)'}
            </span>
          </div>
          <p className="text-xs font-mono text-[#aaaaaa] mt-1">
            Browse server root container files, view configurations, logs, and manage mods.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isSudo && (
            <>
              <button
                onClick={() => {
                  setCreateIsDir(false);
                  setCreateName('');
                  setCreateModalOpen(true);
                }}
                className="button button-primary px-3 py-1.5 text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                NEW FILE
              </button>
              <button
                onClick={() => {
                  setCreateIsDir(true);
                  setCreateName('');
                  setCreateModalOpen(true);
                }}
                className="mc-btn px-3 py-1.5 text-xs flex items-center gap-1"
              >
                <Folder className="w-3.5 h-3.5 text-[#ffaa00]" />
                NEW FOLDER
              </button>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="mc-btn px-3 py-1.5 text-xs flex items-center gap-1 bg-[#1e2a38] text-[#55ffff]"
              >
                <Upload className="w-3.5 h-3.5" />
                UPLOAD
              </button>
            </>
          )}
          <button
            onClick={() => loadDirectory(currentPath)}
            className="mc-btn px-3 py-1.5 text-xs"
            title="Refresh current folder"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            REFRESH
          </button>
        </div>
      </div>

      {/* Breadcrumb & Navigation Bar */}
      <div className="bg-[#313233] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto font-mono text-xs">
          {parentPath !== null && (
            <button
              onClick={() => setCurrentPath(parentPath)}
              className="mc-btn p-1 text-xs mr-1"
              title="Up one level"
            >
              <CornerLeftUp className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.path}>
                {idx > 0 && <span className="text-[#666]">/</span>}
                <button
                  onClick={() => setCurrentPath(crumb.path)}
                  className={`px-2 py-0.5 border text-xs font-mono transition-none ${
                    idx === breadcrumbs.length - 1
                      ? 'bg-[#1e1e1f] text-[#55ff55] border-[#55ff55]'
                      : 'bg-[#242425] text-[#d0d1d4] border-[#141415] hover:bg-[#38393a]'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-[#888888] absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Filter current folder..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-8 py-1 text-xs h-8 w-full"
          />
        </div>
      </div>

      {/* Main Files Table */}
      <div className="bg-[#313233] border-4 border-[#141415] shadow-[inset_3px_3px_0_#48494a,inset_-3px_-3px_0_#1e1e1f] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#242425] text-xs font-heading uppercase tracking-wider text-[#aaaaaa] border-b-2 border-[#141415]">
              <tr>
                <th className="px-4 py-3">NAME</th>
                <th className="px-4 py-3">TYPE</th>
                <th className="px-4 py-3">SIZE</th>
                <th className="px-4 py-3">LAST MODIFIED</th>
                <th className="px-4 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1f]">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="bg-[#1e1e1f]">
                    <td colSpan={5} className="px-4 py-3">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#777777] italic">
                    {search ? 'No files match your filter.' : 'This directory is currently empty.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.path}
                    className="bg-[#1e1e1f] hover:bg-[#28292a] transition-none group cursor-pointer"
                    onClick={() => handleOpenFile(item)}
                  >
                    {/* Name */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {getFileIcon(item)}
                        <span
                          className={`font-heading text-xs tracking-wide ${
                            item.isDirectory ? 'text-[#ffaa00] group-hover:underline' : 'text-white'
                          }`}
                        >
                          {item.name}
                        </span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-2.5 text-[#aaaaaa]">
                      {item.isDirectory ? (
                        <span className="px-1.5 py-0.5 bg-[#252526] text-[10px] font-heading border border-[#141415] text-[#ffaa00]">
                          DIRECTORY
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-[#252526] text-[10px] font-heading border border-[#141415] uppercase text-[#aaaaaa]">
                          {item.extension ? `${item.extension.toUpperCase()} FILE` : 'FILE'}
                        </span>
                      )}
                    </td>

                    {/* Size */}
                    <td className="px-4 py-2.5 text-[#d0d1d4]">
                      {item.isDirectory ? '-' : formatFileSize(item.size)}
                    </td>

                    {/* Last Modified */}
                    <td className="px-4 py-2.5 text-[#777777]">
                      {item.lastModified ? new Date(item.lastModified).toLocaleString() : '-'}
                    </td>

                    {/* Action buttons */}
                    <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {!item.isDirectory && (
                          <>
                            <button
                              onClick={() => handleOpenFile(item)}
                              className="mc-btn px-2 py-0.5 text-[10px]"
                              title="View or edit file content"
                            >
                              <Edit3 className="w-3 h-3 mr-0.5" />
                              {isSudo ? 'EDIT' : 'VIEW'}
                            </button>
                            <a
                              href={api.downloadFileUrl(item.path)}
                              download={item.name}
                              className="mc-btn px-2 py-0.5 text-[10px] flex items-center gap-0.5"
                              title="Download raw file"
                            >
                              <Download className="w-3 h-3" />
                              DOWNLOAD
                            </a>
                          </>
                        )}

                        {isSudo && (
                          <>
                            <button
                              onClick={() => {
                                setRenameItem(item);
                                setRenameNewName(item.name);
                              }}
                              className="mc-btn px-2 py-0.5 text-[10px]"
                              title="Rename file or directory"
                            >
                              RENAME
                            </button>
                            <button
                              onClick={() => setDeleteItem(item)}
                              className="mc-btn-danger px-2 py-0.5 text-[10px]"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code Editor / Viewer Modal */}
      {editorFile && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none animate-fadeIn">
          <div className="bg-[#2e2f30] border-4 border-[#141415] shadow-[inset_3px_3px_0_#48494a,inset_-3px_-3px_0_#1e1e1f] w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-3 bg-[#242425] border-b-4 border-[#141415] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <FileCode className="w-5 h-5 text-[#55ffff]" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-heading text-white tracking-wide">{editorFile.name}</h2>
                    <span className={`px-2 py-0.2 text-[9px] font-heading uppercase border ${
                      isSudo ? 'bg-[#1e3816] text-[#55ff55] border-[#11240c]' : 'bg-[#152336] text-[#55ffff] border-[#0f2d4a]'
                    }`}>
                      {isSudo ? 'EDITABLE' : 'READ-ONLY'}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-[#888888]">{editorFile.path} · {formatFileSize(editorFile.size)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isSudo && (
                  <button
                    onClick={handleSaveEditor}
                    disabled={savingFile}
                    className="button button-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingFile ? 'SAVING...' : 'SAVE CHANGES (CTRL+S)'}
                  </button>
                )}
                <button
                  onClick={() => setEditorFile(null)}
                  className="mc-btn p-1.5"
                  title="Close editor"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Read-Only Notice for Admin */}
            {!isSudo && (
              <div className="px-3 py-1.5 bg-[#172554] border-b-2 border-[#1e1e1f] flex items-center justify-between text-xs font-mono text-[#93c5fd]">
                <span>Notice: Viewing file in Read-Only mode. Saving changes is restricted to the 'sudo' operator.</span>
                <span className="font-heading uppercase text-[9px] px-1.5 py-0.5 bg-[#1e3a8a] text-white">ADMIN VIEW</span>
              </div>
            )}

            {/* Editor Area */}
            <div className="flex-1 p-2 bg-[#141415] overflow-hidden flex flex-col font-mono text-xs">
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                readOnly={!isSudo}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    if (isSudo) {
                      handleSaveEditor();
                    }
                  }
                }}
                className={`w-full h-full bg-[#111112] text-[#f3f4f6] p-4 border-2 border-[#1e1e1f] font-mono text-xs resize-none focus:outline-none focus:border-[#55ff55] leading-relaxed shadow-[inset_2px_2px_0_#0a0a0b] ${
                  !isSudo ? 'opacity-90 cursor-default' : ''
                }`}
                placeholder="File content is empty..."
                spellCheck={false}
              />
            </div>

            {/* Editor Footer */}
            <div className="p-2.5 bg-[#242425] border-t-2 border-[#1e1e1f] flex items-center justify-between text-[11px] font-mono text-[#aaaaaa]">
              <span>Lines: {editorContent.split('\n').length} · Characters: {editorContent.length}</span>
              <span>Encoding: UTF-8</span>
            </div>
          </div>
        </div>
      )}

      {/* Upload File Modal (Sudo Only) */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none animate-fadeIn">
          <form
            onSubmit={handleUploadSubmit}
            className="bg-[#2e2f30] border-4 border-[#141415] shadow-[inset_3px_3px_0_#48494a,inset_-3px_-3px_0_#1e1e1f] w-full max-w-md p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b-2 border-[#141415] pb-2">
              <h3 className="font-heading text-white text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#55ffff]" />
                UPLOAD FILE TO SERVER
              </h3>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="mc-btn p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-mono text-[#aaaaaa]">
              Target directory: <span className="text-[#55ff55]">/{currentPath || 'server-root'}</span>
            </p>

            <div className="border-2 border-dashed border-[#444] bg-[#1a1a1b] p-6 text-center space-y-2">
              <input
                type="file"
                id="file-upload"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="mc-btn px-4 py-2 text-xs cursor-pointer inline-block"
              >
                CHOOSE FILE
              </label>
              <p className="text-xs font-mono text-white truncate max-w-xs mx-auto">
                {uploadFile ? uploadFile.name : 'No file selected'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#141415]">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="mc-btn px-3 py-1.5 text-xs"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="button button-primary px-4 py-1.5 text-xs"
              >
                {uploading ? 'UPLOADING...' : 'START UPLOAD'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create File or Folder Modal (Sudo Only) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none animate-fadeIn">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-[#2e2f30] border-4 border-[#141415] shadow-[inset_3px_3px_0_#48494a,inset_-3px_-3px_0_#1e1e1f] w-full max-w-md p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b-2 border-[#141415] pb-2">
              <h3 className="font-heading text-white text-sm flex items-center gap-2">
                {createIsDir ? <Folder className="w-4 h-4 text-[#ffaa00]" /> : <File className="w-4 h-4 text-[#55ffff]" />}
                CREATE NEW {createIsDir ? 'DIRECTORY' : 'FILE'}
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="mc-btn p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-mono text-[#aaaaaa]">
              Location: <span className="text-[#55ff55]">/{currentPath || 'server-root'}</span>
            </p>

            <div>
              <label className="block text-[11px] font-heading text-[#d0d1d4] uppercase mb-1">
                {createIsDir ? 'DIRECTORY NAME' : 'FILE NAME (e.g. server.properties)'}
              </label>
              <input
                type="text"
                placeholder={createIsDir ? 'e.g. datapacks' : 'e.g. custom.json'}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="form-input text-xs w-full"
                autoFocus
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#141415]">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="mc-btn px-3 py-1.5 text-xs"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={!createName.trim() || creating}
                className="button button-primary px-4 py-1.5 text-xs"
              >
                {creating ? 'CREATING...' : 'CREATE'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rename Modal (Sudo Only) */}
      {renameItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none animate-fadeIn">
          <form
            onSubmit={handleRenameSubmit}
            className="bg-[#2e2f30] border-4 border-[#141415] shadow-[inset_3px_3px_0_#48494a,inset_-3px_-3px_0_#1e1e1f] w-full max-w-md p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b-2 border-[#141415] pb-2">
              <h3 className="font-heading text-white text-sm">
                RENAME {renameItem.isDirectory ? 'DIRECTORY' : 'FILE'}
              </h3>
              <button
                type="button"
                onClick={() => setRenameItem(null)}
                className="mc-btn p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-heading text-[#d0d1d4] uppercase mb-1">
                NEW NAME
              </label>
              <input
                type="text"
                value={renameNewName}
                onChange={(e) => setRenameNewName(e.target.value)}
                className="form-input text-xs w-full"
                autoFocus
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#141415]">
              <button
                type="button"
                onClick={() => setRenameItem(null)}
                className="mc-btn px-3 py-1.5 text-xs"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={!renameNewName.trim() || renaming}
                className="button button-primary px-4 py-1.5 text-xs"
              >
                {renaming ? 'RENAMING...' : 'RENAME'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal (Sudo Only) */}
      {deleteItem && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDeleteItem(null)}
          onConfirm={handleDeleteConfirm}
          isLoading={deleting}
          variant="danger"
          title={`DELETE ${deleteItem.isDirectory ? 'DIRECTORY' : 'FILE'}`}
          message={`Are you sure you want to permanently delete "${deleteItem.name}"? ${
            deleteItem.isDirectory ? 'All contents inside this folder will be deleted.' : ''
          }`}
        />
      )}
    </div>
  );
};
