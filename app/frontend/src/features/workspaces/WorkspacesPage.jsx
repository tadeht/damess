import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  Check,
  Clock,
  Copy,
  Download,
  FileText,
  Hash,
  Image,
  KeyRound,
  Link2,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Send,
  Save,
  Settings,
  Smile,
  Paperclip,
  Ticket,
  Trash2,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useAuth } from "../../app/AuthContext.jsx";
import { AppBackground } from "../../components/ui/AppBackground.jsx";
import { EmojiPicker } from "../../components/ui/EmojiPicker.jsx";
import { getErrorMessage, api } from "../../lib/api.js";

const emptyCreateForm = {
  name: "",
  description: "",
};

const workspaceUiScale = 0.8;
const workspaceUiScaleStyle = {
  width: `${100 / workspaceUiScale}%`,
  height: `${100 / workspaceUiScale}%`,
  transform: `scale(${workspaceUiScale})`,
  transformOrigin: "top left",
};

const requestStatusOptions = [
  { code: "DANG_XU_LY", name: "Đang xử lý" },
  { code: "CAN_BO_SUNG", name: "Cần bổ sung thông tin" },
  { code: "TAM_DUNG", name: "Tạm dừng" },
  { code: "HOAN_THANH", name: "Hoàn thành" },
  { code: "TU_CHOI", name: "Từ chối" },
];

export function WorkspacesPage() {
  const { isAuthenticated, loading, user, logout, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [inviteCode, setInviteCode] = useState("");
  const [invitePreview, setInvitePreview] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userSettingsOpen, setUserSettingsOpen] = useState(false);
  const [fullNameFormOpen, setFullNameFormOpen] = useState(false);
  const [fullNameForm, setFullNameForm] = useState("");
  const [usernameFormOpen, setUsernameFormOpen] = useState(false);
  const [usernameForm, setUsernameForm] = useState("");
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [workspaceSettingsOpen, setWorkspaceSettingsOpen] = useState(false);
  const [overviewRequests, setOverviewRequests] = useState([]);
  const [overviewActivities, setOverviewActivities] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [topbarProjects, setTopbarProjects] = useState([]);
  const [activeWorkspaceView, setActiveWorkspaceView] = useState("overview");
  const [workspaceMenu, setWorkspaceMenu] = useState(null);
  const [mutedWorkspaceIds, setMutedWorkspaceIds] = useState([]);
  const [inviteWorkspace, setInviteWorkspace] = useState(null);
  const [leaveWorkspaceTarget, setLeaveWorkspaceTarget] = useState(null);
  const [deleteWorkspaceTarget, setDeleteWorkspaceTarget] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendsData, setFriendsData] = useState({ friends: [], incomingRequests: [], outgoingRequests: [] });
  const [friendListSearch, setFriendListSearch] = useState("");
  const [friendAddOpen, setFriendAddOpen] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [friendSearchResult, setFriendSearchResult] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatAttachment, setChatAttachment] = useState(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [iconMenuOpen, setIconMenuOpen] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const createSubmittingRef = useRef(false);
  const openingChatIdRef = useRef(null);
  const forceScrollToLatestRef = useRef(false);
  const chatScrollRef = useRef(null);
  const chatMessagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const inviteFromUrl = useMemo(() => new URLSearchParams(location.search).get("invite") || "", [location.search]);
  const friendPanelFromUrl = useMemo(() => new URLSearchParams(location.search).get("friends") || "", [location.search]);
  const chatFromUrl = useMemo(() => Number(new URLSearchParams(location.search).get("chat") || 0), [location.search]);
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedId) || null;
  const unreadMessageCount = friendsData.friends.reduce((total, item) => total + (item.unreadCount || 0), 0);
  const [updateAvailable, setUpdateAvailable] = useState(null);

  useEffect(() => {
    const isDesktop = window.location.protocol === "file:" || Boolean(window.electronAPI);
    if (!isDesktop) return;

    const currentVersion = "0.9.0"; // Simulated version
    fetch("https://api.github.com/repos/tadeht/damess/releases/latest")
      .then((res) => res.json())
      .then((release) => {
        const latestVersion = release.tag_name;
        if (latestVersion && latestVersion !== `v${currentVersion}`) {
          const asset = release.assets?.find((a) => a.name.endsWith(".zip") || a.name.includes("Desktop"));
          if (asset) {
            setUpdateAvailable({
              version: latestVersion,
              downloadUrl: asset.browser_download_url,
            });
          }
        }
      })
      .catch((err) => console.error("Error checking updates", err));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadWorkspaces();
      loadNotifications();
      loadFriends();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedWorkspace || friendsOpen) {
      setOverviewRequests([]);
      setOverviewActivities([]);
      setTopbarProjects([]);
      return;
    }

    loadWorkspaceOverview();
    loadTopbarProjects();
  }, [selectedWorkspace?.id, friendsOpen]);

  useEffect(() => {
    if (inviteFromUrl) {
      setInviteCode(inviteFromUrl);
      previewInvite(inviteFromUrl);
    }
  }, [inviteFromUrl]);

  useEffect(() => {
    if (friendPanelFromUrl || chatFromUrl) {
      setFriendsOpen(true);
    }

    if (chatFromUrl && friendsData.friends.length > 0) {
      const matchedFriendship = friendsData.friends.find((item) => item.friend.id === chatFromUrl);
      if (matchedFriendship && activeChat?.id !== matchedFriendship.friend.id && openingChatIdRef.current !== matchedFriendship.friend.id) {
        openChat(matchedFriendship.friend);
      }
    }
  }, [friendPanelFromUrl, chatFromUrl, friendsData.friends, activeChat?.id]);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadNotifications();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!friendsOpen || !activeChat?.id) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadChatMessages(activeChat.id, { silent: true });
      loadFriends();
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [friendsOpen, activeChat?.id]);

  useEffect(() => {
    if (!activeChat?.id || chatLoading) {
      return;
    }

    if (forceScrollToLatestRef.current || isChatNearLatest()) {
      window.setTimeout(() => {
        scrollChatToLatest("auto");
        forceScrollToLatestRef.current = false;
      }, 0);
      return;
    }

    setShowJumpToLatest(true);
  }, [activeChat?.id, chatMessages.length, chatLoading]);

  useEffect(() => {
    const text = error || message;

    if (!text) {
      return undefined;
    }

    const type = error ? "error" : "success";
    setToast({ type, text });

    const timeoutId = window.setTimeout(() => {
      setToast(null);
      if (type === "error") {
        setError("");
      } else {
        setMessage("");
      }
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [error, message]);

  if (!loading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  async function loadWorkspaces() {
    setFetching(true);
    setError("");

    try {
      const response = await api.get("/workspaces");
      setWorkspaces(response.data.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setFetching(false);
    }
  }

  async function loadNotifications() {
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data.data?.notifications || []);
      setUnreadCount(response.data.data?.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  }

  async function markAllNotificationsRead() {
    await api.patch("/notifications/read-all");
    await loadNotifications();
  }

  async function loadWorkspaceOverview() {
    setOverviewLoading(true);

    try {
      const [requestsResponse, activitiesResponse] = await Promise.all([
        api.get(`/requests?limit=100&workspaceId=${selectedWorkspace.id}`),
        api.get(`/workspaces/${selectedWorkspace.id}/activities`),
      ]);
      setOverviewRequests(requestsResponse.data.data?.items || []);
      setOverviewActivities(activitiesResponse.data.data || []);
    } catch {
      setOverviewRequests([]);
      setOverviewActivities([]);
    } finally {
      setOverviewLoading(false);
    }
  }

  async function loadTopbarProjects() {
    if (!selectedWorkspace?.id) {
      setTopbarProjects([]);
      return;
    }

    try {
      const response = await api.get(`/projects?workspaceId=${selectedWorkspace.id}`);
      setTopbarProjects(response.data.data || []);
    } catch {
      setTopbarProjects([]);
    }
  }

  async function markNotificationRead(notification) {
    if (!notification) {
      return;
    }

    if (!notification.readAt) {
      await api.patch(`/notifications/${notification.id}/read`);
      await loadNotifications();
    }

    if (notification.link) {
      setNotificationOpen(false);
      navigate(resolveNotificationPath(notification.link));
    }
  }

  async function loadFriends() {
    try {
      const response = await api.get("/friends");
      setFriendsData(response.data.data || { friends: [], incomingRequests: [], outgoingRequests: [] });
    } catch {
      setFriendsData({ friends: [], incomingRequests: [], outgoingRequests: [] });
    }
  }

  function toggleFriendsPanel() {
    setFriendsOpen((open) => {
      if (!open) {
        setFriendAddOpen(false);
        setAddMenuOpen(false);
        setUserMenuOpen(false);
        setUserSettingsOpen(false);
        setFullNameFormOpen(false);
        setUsernameFormOpen(false);
        setWorkspaceSettingsOpen(false);
        setWorkspaceMenu(null);
        setNotificationOpen(false);
        loadFriends();
      }

      return !open;
    });
  }

  function openFriendAddPopup() {
    setFriendAddOpen(true);
    setFriendUsername("");
    setFriendSearchResult(null);
    setError("");
  }

  function closeFriendAddPopup() {
    setFriendAddOpen(false);
    setFriendUsername("");
    setFriendSearchResult(null);
  }

  async function searchFriend(event) {
    event.preventDefault();
    setError("");
    setFriendSearchResult(null);

    try {
      const response = await api.get(`/friends/search?username=${encodeURIComponent(friendUsername)}`);
      setFriendSearchResult(response.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function sendFriendRequest(username = friendUsername) {
    setError("");

    try {
      const response = await api.post("/friends/requests", { username });
      setMessage(response.data.message || "Đã gửi lời mời kết bạn.");
      setFriendSearchResult(null);
      setFriendUsername("");
      setFriendAddOpen(false);
      await loadFriends();
      await loadNotifications();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function respondFriendRequest(request, action) {
    setError("");

    try {
      const response = await api.post(`/friends/requests/${request.id}/${action}`);
      setMessage(response.data.message || "Đã cập nhật lời mời kết bạn.");
      await loadFriends();
      await loadNotifications();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function loadChatMessages(friendId, options = {}) {
    if (!options.silent) {
      setChatLoading(true);
    }
  
    try {
      const response = await api.get(`/friends/${friendId}/messages`);
      setChatMessages(response.data.data || []);
      await loadNotifications();
    } catch (err) {
      if (!options.silent) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (!options.silent) {
        setChatLoading(false);
      }
    }
  }

  async function openChat(friend) {
    if (!friend || openingChatIdRef.current === friend.id) {
      return;
    }

    openingChatIdRef.current = friend.id;
    forceScrollToLatestRef.current = true;
    setActiveChat(friend);
    setFriendsOpen(true);
    setError("");

    try {
      await loadChatMessages(friend.id);
      await api.patch("/notifications/messages/read", { friendId: friend.id });
      await loadFriends();
      await loadNotifications();
    } finally {
      openingChatIdRef.current = null;
    }
  }

  function closeActiveChat(options = {}) {
    const { keepFriendsParam = true } = options;
    const searchParams = new URLSearchParams(location.search);

    if (searchParams.has("chat") || (!keepFriendsParam && searchParams.has("friends"))) {
      searchParams.delete("chat");

      if (keepFriendsParam) {
        searchParams.set("friends", "1");
      } else {
        searchParams.delete("friends");
      }

      const nextSearch = searchParams.toString();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : "",
        },
        { replace: true },
      );
    }

    openingChatIdRef.current = null;
    setActiveChat(null);
    setChatMessages([]);
    setChatInput("");
    setChatAttachment(null);
    setAttachmentMenuOpen(false);
    setIconMenuOpen(false);
    setShowJumpToLatest(false);
  }

  function scrollChatToLatest(behavior = "smooth") {
    const chatScroll = chatScrollRef.current;

    if (chatScroll) {
      chatScroll.scrollTo({
        top: chatScroll.scrollHeight,
        behavior,
      });
    } else {
      chatMessagesEndRef.current?.scrollIntoView({ block: "end", behavior });
    }

    setShowJumpToLatest(false);
  }

  function isChatNearLatest() {
    const chatScroll = chatScrollRef.current;

    if (!chatScroll) {
      return true;
    }

    return chatScroll.scrollHeight - chatScroll.scrollTop - chatScroll.clientHeight < 160;
  }

  function handleChatScroll(event) {
    const element = event.currentTarget;
    const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    setShowJumpToLatest(distanceToBottom > 280);
  }

  async function sendChatMessage(event) {
    event.preventDefault();

    if (!activeChat || (!chatInput.trim() && !chatAttachment)) {
      return;
    }

    const content = chatInput.trim();
    const attachment = chatAttachment;
    forceScrollToLatestRef.current = true;
    setChatInput("");
    setChatAttachment(null);
    setAttachmentMenuOpen(false);
    setIconMenuOpen(false);

    try {
      const response = await api.post(`/friends/${activeChat.id}/messages`, { content, attachment });
      setChatMessages((current) => [...current, response.data.data]);
      await loadFriends();
    } catch (err) {
      setError(getErrorMessage(err));
      setChatInput(content);
      setChatAttachment(attachment);
    }
  }

  function selectChatAttachment(kind) {
    setAttachmentMenuOpen(false);
    setIconMenuOpen(false);

    if (kind === "IMAGE") {
      imageInputRef.current?.click();
      return;
    }

    fileInputRef.current?.click();
  }

  function handleChatAttachment(event, type) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("File đính kèm tối đa 2MB để boxchat không bị lag.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setChatAttachment({
        type,
        name: file.name,
        mime: file.type || "application/octet-stream",
        data: String(reader.result || ""),
      });
    };
    reader.readAsDataURL(file);
  }

  function insertChatIcon(icon) {
    setChatInput((current) => `${current}${current && !current.endsWith(" ") ? " " : ""}${icon} `);
    setIconMenuOpen(false);
  }

  function openUsernameForm() {
    setUsernameForm(user?.username || "");
    setUsernameStatus(null);
    setFullNameFormOpen(false);
    setUsernameFormOpen(true);
  }

  function openFullNameForm() {
    setFullNameForm(user?.fullName || "");
    setUsernameFormOpen(false);
    setUsernameStatus(null);
    setFullNameFormOpen(true);
  }

  async function updateFullName(event) {
    event.preventDefault();

    const nextFullName = String(fullNameForm || "").trim();

    if (nextFullName.length < 2 || nextFullName.length > 80) {
      setError("Tên hiển thị phải từ 2 đến 80 ký tự.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await api.patch("/auth/profile", { fullName: nextFullName });
      updateUser(response.data.data);
      setMessage(response.data.message || "Đã cập nhật tên hiển thị.");
      setFullNameFormOpen(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function checkUsernameAvailability(value = usernameForm) {
    const nextUsername = String(value || "").trim();
    setUsernameStatus(null);

    if (!nextUsername) {
      return;
    }

    try {
      const response = await api.get(`/auth/username/check?username=${encodeURIComponent(nextUsername)}`);
      setUsernameStatus(response.data.data);
    } catch (err) {
      setUsernameStatus({ available: false, message: getErrorMessage(err) });
    }
  }

  async function updateUsername(event) {
    event.preventDefault();

    if (!usernameStatus?.available || usernameStatus.username !== usernameForm.trim().toLowerCase()) {
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await api.patch("/auth/username", { username: usernameForm });
      updateUser(response.data.data);
      setMessage(response.data.message || "Đã cập nhật username.");
      setUsernameFormOpen(false);
      setUsernameStatus(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function openCreateModal() {
    setCreateForm(emptyCreateForm);
    setError("");
    setMessage("");
    setAddMenuOpen(false);
    setModal("create");
  }

  function openJoinModal() {
    setInviteCode("");
    setInvitePreview(null);
    setError("");
    setMessage("");
    setAddMenuOpen(false);
    setModal("join");
  }

  function openWorkspaceMenu(event, workspace) {
    event.preventDefault();
    setWorkspaceMenu({
      workspace,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function toggleWorkspaceMute(workspace) {
    setMutedWorkspaceIds((current) => (
      current.includes(workspace.id)
        ? current.filter((id) => id !== workspace.id)
        : [...current, workspace.id]
    ));
    setWorkspaceMenu(null);
  }

  function openInviteModal(workspace) {
    setInviteWorkspace(workspace);
    setWorkspaceMenu(null);
    setModal("workspaceInvite");
  }

  function openLeaveModal(workspace) {
    setLeaveWorkspaceTarget(workspace);
    setWorkspaceMenu(null);
    setModal("leave");
  }

  function openDeleteModal(workspace) {
    if (!workspace) {
      return;
    }

    setDeleteWorkspaceTarget(workspace);
    setWorkspaceMenu(null);
    setWorkspaceSettingsOpen(false);
    setModal("delete");
  }

  function closeModal() {
    setModal(null);
    setInvitePreview(null);
    setInviteCode("");
    setInviteWorkspace(null);
    setLeaveWorkspaceTarget(null);
    setDeleteWorkspaceTarget(null);
    navigate("/workspaces", { replace: true });
  }

  async function previewInvite(code) {
    const normalizedCode = String(code || "").trim();

    if (!normalizedCode) {
      setError("Mã mời là bắt buộc.");
      return;
    }

    setModal("invite");
    setInvitePreview(null);
    setMessage("");
    setError("");
    setPreviewLoading(true);

    try {
      const response = await api.get(`/workspaces/invite/${encodeURIComponent(normalizedCode)}`);
      setInvitePreview(response.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
      setModal("join");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function createWorkspace(event) {
    event.preventDefault();

    if (createSubmittingRef.current) {
      return;
    }

    createSubmittingRef.current = true;
    setMessage("");
    setError("");
    setSubmitting(true);

    try {
      const response = await api.post("/workspaces", createForm);
      const createdWorkspace = response.data.data;
      setMessage(response.data.message || "Tạo workspace thành công.");
      setCreateForm(emptyCreateForm);
      setSelectedId(createdWorkspace?.id || null);
      if (createdWorkspace) {
        setWorkspaces((current) => [createdWorkspace, ...current.filter((workspace) => workspace.id !== createdWorkspace.id)]);
      }
      setModal(null);
      await loadWorkspaces();
      await loadNotifications();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
      createSubmittingRef.current = false;
    }
  }

  async function previewCodeJoin(event) {
    event.preventDefault();
    await previewInvite(inviteCode);
  }

  async function confirmJoinWorkspace() {
    if (!invitePreview?.inviteCode) {
      return;
    }

    setMessage("");
    setError("");
    setSubmitting(true);

    try {
      const response = await api.post("/workspaces/join", { code: invitePreview.inviteCode });
      const joinedWorkspace = response.data.data;
      setMessage(response.data.message || "Tham gia workspace thành công.");
      setSelectedId(joinedWorkspace?.id || null);
      setModal(null);
      setInviteCode("");
      setInvitePreview(null);
      navigate("/workspaces", { replace: true });
      await loadWorkspaces();
      await loadNotifications();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmLeaveWorkspace() {
    if (!leaveWorkspaceTarget) {
      return;
    }

    setMessage("");
    setError("");
    setSubmitting(true);

    try {
      const response = await api.delete(`/workspaces/${leaveWorkspaceTarget.id}/members/me`);
      setMessage(response.data.message || "Đã thoát khỏi workspace.");
      setModal(null);
      setLeaveWorkspaceTarget(null);
      setSelectedId(null);
      await loadWorkspaces();
      await loadNotifications();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeleteWorkspace() {
    if (!deleteWorkspaceTarget) {
      return;
    }

    setMessage("");
    setError("");
    setSubmitting(true);

    try {
      const response = await api.delete(`/workspaces/${deleteWorkspaceTarget.id}`);
      setMessage(response.data.message || "Đã xoá workspace.");
      setWorkspaces((current) => {
        const nextWorkspaces = current.filter((workspace) => workspace.id !== deleteWorkspaceTarget.id);
        setSelectedId(null);
        return nextWorkspaces;
      });
      setModal(null);
      setDeleteWorkspaceTarget(null);
      await loadWorkspaces();
      await loadNotifications();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function replaceWorkspace(updatedWorkspace) {
    if (!updatedWorkspace?.id) {
      return;
    }

    setWorkspaces((current) => current.map((workspace) => (workspace.id === updatedWorkspace.id ? updatedWorkspace : workspace)));
  }

  async function updateWorkspaceSettings(settings) {
    if (!selectedWorkspace) {
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await api.patch(`/workspaces/${selectedWorkspace.id}/settings`, settings);
      replaceWorkspace(response.data.data);
      setMessage(response.data.message || "Đã cập nhật cấu hình workspace.");
      await loadWorkspaceOverview();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function updateWorkspaceMemberRole(member, role) {
    if (!selectedWorkspace || !member || member.role === role) {
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await api.patch(`/workspaces/${selectedWorkspace.id}/members/${member.id}/role`, { role });
      replaceWorkspace(response.data.data);
      setMessage(response.data.message || "Đã cập nhật vai trò thành viên.");
      await loadWorkspaceOverview();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function removeWorkspaceMember(member) {
    if (!selectedWorkspace || !member) {
      return;
    }

    const confirmed = window.confirm(`Xóa ${member.user?.fullName || member.user?.email || "thành viên"} khỏi workspace?`);

    if (!confirmed) {
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await api.delete(`/workspaces/${selectedWorkspace.id}/members/${member.id}`);
      replaceWorkspace(response.data.data);
      setMessage(response.data.message || "Đã xóa thành viên khỏi workspace.");
      await loadWorkspaceOverview();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function directMessageWorkspaceMember(member) {
    const targetUser = member?.user;

    if (!targetUser || targetUser.id === user?.id) {
      return;
    }

    const existedFriendship = friendsData.friends.find((item) => item.friend.id === targetUser.id);

    if (existedFriendship) {
      openChat(existedFriendship.friend);
      return;
    }

    setFriendsOpen(true);
    setFriendAddOpen(true);
    setFriendUsername(targetUser.username || "");
    setFriendSearchResult(null);
    setMessage("Bạn cần kết bạn trước khi nhắn tin trực tiếp.");
  }

  async function copyText(value) {
    await navigator.clipboard?.writeText(value);
    setMessage("Đã copy vào clipboard.");
  }

  const friendsPanel = (
    <FriendsPanel
      user={user}
      data={friendsData}
      listSearch={friendListSearch}
      addOpen={friendAddOpen}
      username={friendUsername}
      searchResult={friendSearchResult}
      activeChat={activeChat}
      messages={chatMessages}
      chatInput={chatInput}
      attachment={chatAttachment}
      attachmentMenuOpen={attachmentMenuOpen}
      iconMenuOpen={iconMenuOpen}
      loading={chatLoading}
      onClose={() => {
        closeActiveChat({ keepFriendsParam: false });
        setFriendsOpen(false);
      }}
      onCloseActiveChat={closeActiveChat}
      onListSearchChange={setFriendListSearch}
      onOpenAdd={openFriendAddPopup}
      onCloseAdd={closeFriendAddPopup}
      onUsernameChange={setFriendUsername}
      onSearch={searchFriend}
      onSendRequest={sendFriendRequest}
      onRespondRequest={respondFriendRequest}
      onOpenChat={openChat}
      onChatInputChange={setChatInput}
      onRemoveAttachment={() => setChatAttachment(null)}
      onToggleAttachmentMenu={() => {
        setAttachmentMenuOpen((open) => !open);
        setIconMenuOpen(false);
      }}
      onSelectAttachment={selectChatAttachment}
      onToggleIconMenu={() => {
        setIconMenuOpen((open) => !open);
        setAttachmentMenuOpen(false);
      }}
      onSelectIcon={insertChatIcon}
      imageInputRef={imageInputRef}
      fileInputRef={fileInputRef}
      onImageChange={(event) => handleChatAttachment(event, "IMAGE")}
      onFileChange={(event) => handleChatAttachment(event, "FILE")}
      onSendMessage={sendChatMessage}
      chatScrollRef={chatScrollRef}
      messagesEndRef={chatMessagesEndRef}
      showJumpToLatest={showJumpToLatest}
      onChatScroll={handleChatScroll}
      onJumpToLatest={() => scrollChatToLatest("smooth")}
      onPreviewImage={setImagePreview}
    />
  );

  return (
    <div className="h-screen overflow-hidden bg-canvas font-body text-white">
      <AppBackground />
      {toast && <Toast type={toast.type} text={toast.text} />}
      <div className="relative z-10 flex min-h-0" style={workspaceUiScaleStyle}>
        <WorkspaceRail
          workspaces={workspaces}
          selectedId={selectedWorkspace?.id}
          addMenuOpen={addMenuOpen}
          userMenuOpen={userMenuOpen}
          userSettingsOpen={userSettingsOpen}
          unreadMessageCount={unreadMessageCount}
          chatOpen={friendsOpen}
          onSelect={(workspaceId) => {
            setSelectedId((currentId) => (currentId === workspaceId ? null : workspaceId));
            setActiveWorkspaceView("overview");
            setFriendsOpen(false);
          }}
          onWorkspaceContext={openWorkspaceMenu}
          onOpenFriends={toggleFriendsPanel}
          onToggleAdd={() => setAddMenuOpen((open) => !open)}
          onToggleUser={() => {
            setUserMenuOpen((open) => !open);
            setUserSettingsOpen(false);
            setFullNameFormOpen(false);
            setUsernameFormOpen(false);
          }}
          onToggleUserSettings={() => {
            setUserSettingsOpen((open) => !open);
            setFullNameFormOpen(false);
            setUsernameFormOpen(false);
          }}
          fullNameFormOpen={fullNameFormOpen}
          fullNameForm={fullNameForm}
          usernameFormOpen={usernameFormOpen}
          usernameForm={usernameForm}
          usernameStatus={usernameStatus}
          submittingUsername={submitting}
          onOpenFullNameForm={openFullNameForm}
          onFullNameFormChange={setFullNameForm}
          onSubmitFullName={updateFullName}
          onOpenUsernameForm={openUsernameForm}
          onUsernameFormChange={(value) => {
            setUsernameForm(value);
            setUsernameStatus(null);
          }}
          onCheckUsername={checkUsernameAvailability}
          onSubmitUsername={updateUsername}
          onCreate={openCreateModal}
          onJoin={openJoinModal}
          user={user}
          logout={logout}
        />

        {friendsOpen ? (
          friendsPanel
        ) : (
          <>
        {selectedWorkspace && (
          <WorkspaceSidebar
            workspace={selectedWorkspace}
            user={user}
            settingsOpen={workspaceSettingsOpen}
            onToggleSettings={() => setWorkspaceSettingsOpen((open) => !open)}
            onCloseSettings={() => setWorkspaceSettingsOpen(false)}
            onInvite={openInviteModal}
            onDelete={openDeleteModal}
            activeView={activeWorkspaceView}
            onViewChange={setActiveWorkspaceView}
          />
        )}

        <main
          className="flex h-full min-w-0 flex-1 flex-col overflow-hidden"
          onMouseDown={() => {
            setWorkspaceMenu(null);
            setAddMenuOpen(false);
            setUserMenuOpen(false);
            setUserSettingsOpen(false);
            setFullNameFormOpen(false);
            setUsernameFormOpen(false);
            setWorkspaceSettingsOpen(false);
            setNotificationOpen(false);
          }}
        >
          <WorkspaceTopbar
            workspaces={workspaces}
            selectedWorkspace={selectedWorkspace}
            requests={overviewRequests}
            projects={topbarProjects}
            friends={friendsData.friends}
            notifications={notifications}
            unreadCount={unreadCount}
            notificationOpen={notificationOpen}
            updateAvailable={updateAvailable}
            onToggleNotifications={() => {
              setNotificationOpen((open) => !open);
              setWorkspaceMenu(null);
              setAddMenuOpen(false);
              setUserMenuOpen(false);
              setUserSettingsOpen(false);
              setFullNameFormOpen(false);
              setUsernameFormOpen(false);
              setWorkspaceSettingsOpen(false);
            }}
            onMarkRead={markNotificationRead}
            onMarkAllRead={markAllNotificationsRead}
            onSearchResult={(result) => {
              setNotificationOpen(false);

              if (result.type === "friend") {
                setFriendsOpen(true);
                openChat(result.friend);
                return;
              }

              if (result.workspaceId) {
                setSelectedId(result.workspaceId);
              }

              setFriendsOpen(false);
              setActiveWorkspaceView(result.type === "request" ? "requests" : result.type === "project" ? "projects" : "overview");
            }}
          />
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden border-l border-white/10 bg-black/32">
            {!selectedWorkspace && (
            <div className="shrink-0 border-b border-white/10 px-6 py-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <button type="button" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/7 text-white/72">
                      <Hash className="h-5 w-5" />
                    </button>
                    <h1 className="text-2xl font-semibold text-white">
                      Workspace
                    </h1>
                  </div>
                  <p className="mt-2 text-sm text-white/50">
                    Tạo workspace đầu tiên hoặc tham gia bằng mã mời.
                  </p>
                </div>

              </div>
            </div>
            )}

            <div className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 ${selectedWorkspace ? "" : "flex items-center justify-center"}`}>
              {selectedWorkspace ? (
                activeWorkspaceView === "projects" ? (
                  <WorkspaceProjects workspace={selectedWorkspace} user={user} />
                ) : activeWorkspaceView === "members" ? (
                  <WorkspaceMembers
                    workspace={selectedWorkspace}
                    user={user}
                    submitting={submitting}
                    onInvite={() => openInviteModal(selectedWorkspace)}
                    onRoleChange={updateWorkspaceMemberRole}
                    onRemove={removeWorkspaceMember}
                    onDirectMessage={directMessageWorkspaceMember}
                  />
                ) : activeWorkspaceView === "overview" ? (
                  <WorkspaceOverview workspace={selectedWorkspace} requests={overviewRequests} activities={overviewActivities} loading={overviewLoading} />
                ) : activeWorkspaceView === "requests" ? (
                  <WorkspaceRequests workspace={selectedWorkspace} user={user} requests={overviewRequests} loading={overviewLoading} onReload={loadWorkspaceOverview} onPreviewImage={setImagePreview} />
                ) : activeWorkspaceView === "activity" ? (
                  <WorkspaceActivity activities={overviewActivities} loading={overviewLoading} />
                ) : activeWorkspaceView === "settings" ? (
                  <WorkspaceSettings workspace={selectedWorkspace} user={user} submitting={submitting} onSave={updateWorkspaceSettings} />
                ) : (
                  <WorkspacePlannedView view={activeWorkspaceView} />
                )
              ) : workspaces.length > 0 ? (
                <SelectWorkspacePrompt />
              ) : (
                <EmptyWorkspace onCreate={openCreateModal} onJoin={openJoinModal} />
              )}
            </div>
          </section>
        </main>
          </>
        )}
      </div>

      {workspaceMenu && (
        <WorkspaceContextMenu
          menu={workspaceMenu}
          muted={mutedWorkspaceIds.includes(workspaceMenu.workspace.id)}
          isCreator={workspaceMenu.workspace.createdById === user?.id}
          onMute={() => toggleWorkspaceMute(workspaceMenu.workspace)}
          onInvite={() => openInviteModal(workspaceMenu.workspace)}
          onLeave={() => openLeaveModal(workspaceMenu.workspace)}
          onClose={() => setWorkspaceMenu(null)}
        />
      )}

      {modal === "create" && (
        <Modal title="Tạo workspace mới" onClose={closeModal}>
          <form onSubmit={createWorkspace} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/70">Tên workspace</label>
              <input
                value={createForm.name}
                onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-full border border-white/15 bg-white/8 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/50"
                placeholder="Ví dụ: Dự án tốt nghiệp"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/70">Mô tả</label>
              <textarea
                value={createForm.description}
                onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                className="w-full resize-none rounded-[22px] border border-white/15 bg-white/8 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/50"
                placeholder="Mục tiêu, phạm vi hoặc ghi chú ngắn cho workspace"
              />
            </div>
            <FormActions submitting={submitting} submitLabel="Tạo workspace" onCancel={closeModal} />
          </form>
        </Modal>
      )}

      {modal === "join" && (
        <Modal title="Tham gia bằng mã mời" onClose={closeModal}>
          <form onSubmit={previewCodeJoin} className="space-y-4">
            <p className="text-sm leading-6 text-white/58">Nhập mã mời do admin workspace gửi. Sau khi kiểm tra, bạn sẽ thấy màn xác nhận tham gia.</p>
            <input
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              className="w-full rounded-full border border-white/15 bg-white/8 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/50"
              placeholder="Nhập mã mời"
            />
            {error && <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</div>}
            <FormActions submitting={previewLoading} submitLabel="Kiểm tra workspace" onCancel={closeModal} />
          </form>
        </Modal>
      )}

      {modal === "invite" && (
        <Modal title="Xác nhận tham gia" onClose={closeModal}>
          <InviteConfirm loading={previewLoading} invite={invitePreview} submitting={submitting} onConfirm={confirmJoinWorkspace} onCancel={closeModal} />
        </Modal>
      )}

      {modal === "workspaceInvite" && inviteWorkspace && (
        <Modal title="Mời tham gia workspace" onClose={closeModal}>
          <InviteWorkspace workspace={inviteWorkspace} onCopy={copyText} />
        </Modal>
      )}

      {modal === "leave" && leaveWorkspaceTarget && (
        <Modal title="Thoát khỏi workspace" onClose={closeModal}>
          <LeaveWorkspaceConfirm workspace={leaveWorkspaceTarget} user={user} submitting={submitting} onConfirm={confirmLeaveWorkspace} onCancel={closeModal} />
        </Modal>
      )}
      {modal === "delete" && deleteWorkspaceTarget && (
        <Modal title="Xóa workspace" onClose={closeModal}>
          <DeleteWorkspaceConfirm workspace={deleteWorkspaceTarget} user={user} submitting={submitting} onConfirm={confirmDeleteWorkspace} onCancel={closeModal} />
        </Modal>
      )}
      {imagePreview && (
        <ImagePreviewModal image={imagePreview} onClose={() => setImagePreview(null)} />
      )}
    </div>
  );
}

function WorkspaceRail({
  workspaces,
  selectedId,
  addMenuOpen,
  userMenuOpen,
  userSettingsOpen,
  fullNameFormOpen,
  fullNameForm,
  usernameFormOpen,
  usernameForm,
  usernameStatus,
  submittingUsername,
  unreadMessageCount,
  chatOpen,
  onSelect,
  onWorkspaceContext,
  onOpenFriends,
  onToggleAdd,
  onToggleUser,
  onToggleUserSettings,
  onOpenFullNameForm,
  onFullNameFormChange,
  onSubmitFullName,
  onOpenUsernameForm,
  onUsernameFormChange,
  onCheckUsername,
  onSubmitUsername,
  onCreate,
  onJoin,
  user,
  logout,
}) {
  const usernameCanSave = Boolean(usernameStatus?.available && usernameStatus.username === usernameForm.trim().toLowerCase());

  return (
    <aside className="relative flex w-[76px] shrink-0 flex-col items-center border-r border-white/10 bg-[#210026]/88 px-2 py-4">
      <Link
        to="/"
        className="mb-4 block w-full text-center text-[11px] font-medium text-white/42 transition hover:text-white/72"
      >
        Trang chủ
      </Link>

      <button
        type="button"
        onClick={onOpenFriends}
        className={`relative mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border transition ${
          chatOpen ? "border-white bg-white text-black" : "border-white/14 bg-white/10 text-white hover:bg-white/16"
        }`}
        title="Bạn bè và tin nhắn"
      >
        <MessageCircle className="h-5 w-5" />
        {unreadMessageCount > 0 && (
          <span className="absolute bottom-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[#210026]">
            {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
          </span>
        )}
      </button>

      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto">
        {workspaces.map((workspace) => (
          <button
            key={workspace.id}
            type="button"
            onClick={() => onSelect(workspace.id)}
            onContextMenu={(event) => onWorkspaceContext(event, workspace)}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold transition ${
              selectedId === workspace.id ? "border-white bg-white text-black shadow-[0_0_22px_rgba(255,255,255,0.18)]" : "border-white/14 bg-white/10 text-white hover:border-white/34 hover:bg-white/16"
            }`}
            title={workspace.name}
          >
            {workspace.logoData ? <img src={workspace.logoData} alt="" className="h-full w-full rounded-2xl object-cover" /> : getWorkspaceInitials(workspace.name)}
          </button>
        ))}
      </div>

      <div className="relative mt-4">
        <button type="button" onClick={onToggleAdd} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/14 text-white transition hover:bg-white/22" title="Thêm workspace">
          <Plus className="h-6 w-6" />
        </button>

        {addMenuOpen && (
          <div className="absolute bottom-14 left-0 z-40 w-56 rounded-2xl border border-white/12 bg-[#211327] p-2 shadow-2xl">
            <button type="button" onClick={onCreate} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/10">
              <Plus className="h-4 w-4" />
              Tạo workspace mới
            </button>
            <button type="button" onClick={onJoin} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/10">
              <Ticket className="h-4 w-4" />
              Nhập mã mời
            </button>
          </div>
        )}
      </div>

      <div className="relative mt-4">
        <button
          type="button"
          onClick={onToggleUser}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
          title={user?.fullName}
        >
          {getWorkspaceInitials(user?.fullName || "U")}
        </button>

        {userMenuOpen && (
          <div className="absolute bottom-0 left-14 z-40 w-72 rounded-2xl border border-white/12 bg-[#211327] p-3 shadow-2xl">
            <div className="rounded-xl bg-white/7 p-3">
              <div className="text-sm font-semibold text-white">{user?.fullName}</div>
              <div className="mt-1 truncate text-xs text-white/60">@{user?.username}</div>
              <div className="mt-1 truncate text-xs text-white/45">{user?.email}</div>
              <div className="mt-2 text-xs text-white/38">{user?.role?.name}</div>
            </div>

            <button type="button" onClick={onToggleUserSettings} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/10">
              <Settings className="h-4 w-4" />
              Cài đặt
            </button>

            {userSettingsOpen && (
              <div className="mt-1 rounded-xl bg-black/18 p-1">
                <button type="button" onClick={onOpenFullNameForm} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/76 hover:bg-white/10">
                  <UserPlus className="h-4 w-4" />
                  Đổi tên hiển thị
                </button>
                <button type="button" onClick={onOpenUsernameForm} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/76 hover:bg-white/10">
                  <UserPlus className="h-4 w-4" />
                  Đổi username
                </button>
                <Link to="/change-password" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/76 hover:bg-white/10">
                  <KeyRound className="h-4 w-4" />
                  Đổi mật khẩu
                </Link>
                <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-red-200 hover:bg-red-500/12">
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </div>
            )}

            {fullNameFormOpen && (
              <form onSubmit={onSubmitFullName} className="mt-2 rounded-xl bg-black/22 p-3">
                <label className="mb-1.5 block text-xs font-medium text-white/55">Tên hiển thị mới</label>
                <input
                  value={fullNameForm}
                  onChange={(event) => onFullNameFormChange(event.target.value)}
                  className="w-full rounded-full border border-white/12 bg-white/8 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45"
                  placeholder="Nhập họ tên hoặc tên hiển thị"
                />
                <button
                  type="submit"
                  disabled={submittingUsername || fullNameForm.trim().length < 2}
                  className="mt-3 w-full rounded-full bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {submittingUsername ? "Đang cập nhật..." : "Lưu tên hiển thị"}
                </button>
              </form>
            )}

            {usernameFormOpen && (
              <form onSubmit={onSubmitUsername} className="mt-2 rounded-xl bg-black/22 p-3">
                <label className="mb-1.5 block text-xs font-medium text-white/55">Username mới</label>
                <div className="flex gap-2">
                  <input
                    value={usernameForm}
                    onChange={(event) => onUsernameFormChange(event.target.value)}
                    className="min-w-0 flex-1 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45"
                    placeholder="vd: datbn11099"
                  />
                  <button type="button" onClick={() => onCheckUsername(usernameForm)} className="rounded-full bg-white/10 px-3 text-xs font-semibold text-white/72 hover:bg-white/15">
                    Kiểm tra
                  </button>
                </div>
                {usernameStatus && (
                  <div className={`mt-2 text-xs ${usernameStatus.available ? "text-emerald-200" : "text-red-200"}`}>
                    {usernameStatus.message || (usernameStatus.available ? "Username có thể sử dụng." : "Username đã tồn tại.")}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={submittingUsername || !usernameCanSave}
                  className={`mt-3 w-full rounded-full px-3 py-2 text-xs font-semibold transition ${
                    usernameCanSave ? "bg-white text-black hover:bg-white/90" : "bg-white/10 text-white/30"
                  }`}
                >
                  {submittingUsername ? "Đang cập nhật..." : "Lưu username"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function WorkspaceSidebar({ workspace, user, settingsOpen, onToggleSettings, onCloseSettings, onInvite, onDelete, activeView, onViewChange }) {
  const canDeleteWorkspace = Boolean(workspace && (workspace.createdById === user?.id || workspace.currentMemberRole === "ADMIN"));
  const canConfigureWorkspace = canDeleteWorkspace;

  if (!workspace) {
    return (
      <aside className="hidden w-[220px] shrink-0 border-r border-white/10 bg-[#19091f]/88 md:block" aria-label="Chưa chọn workspace" />
    );
  }

  return (
    <aside className="hidden w-[220px] shrink-0 border-r border-white/10 bg-[#19091f]/88 md:block">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-xl font-semibold text-white">{workspace.name}</div>
            <div className="mt-1 text-xs text-white/45">{workspace.memberCount} thành viên</div>
          </div>
          <div className="relative" onMouseDown={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={onToggleSettings}
              disabled={!workspace}
              className="rounded-xl p-2 text-white/60 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              title="Cài đặt workspace"
            >
              <Settings className="h-5 w-5" />
            </button>

            {settingsOpen && workspace && (
              <>
                <div className="fixed inset-0 z-30" role="presentation" onMouseDown={onCloseSettings} />
                <div className="absolute right-0 top-11 z-40 w-64 rounded-2xl border border-white/12 bg-[#211327] p-2 shadow-2xl">
                  <div className="border-b border-white/10 px-3 py-2">
                    <div className="truncate text-sm font-semibold text-white">{workspace.name}</div>
                    <div className="mt-0.5 text-xs text-white/40">Cài đặt workspace</div>
                  </div>
                  <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/10">
                    <Building2 className="h-4 w-4" />
                    Thông tin workspace
                  </button>
                  <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/10">
                    <Users className="h-4 w-4" />
                    Quản lý thành viên
                  </button>
                  <button type="button" onClick={() => onInvite(workspace)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/10">
                    <Link2 className="h-4 w-4" />
                    Invite
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(workspace)}
                    disabled={!canDeleteWorkspace}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-200 hover:bg-red-500/12 disabled:cursor-not-allowed disabled:text-white/32 disabled:hover:bg-transparent"
                    title={canDeleteWorkspace ? "Xóa workspace" : "Chỉ admin workspace có thể xóa"}
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa workspace
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-5 p-4">
        {canConfigureWorkspace && (
          <div className="order-last border-t border-white/10 pt-5">
            <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/30">Quản trị workspace</div>
            <SidebarItem icon={Settings} label="Cấu hình" active={activeView === "settings"} onClick={() => onViewChange("settings")} />
          </div>
        )}
        <SidebarItem icon={Building2} label="Tổng quan" active={activeView === "overview"} onClick={() => onViewChange("overview")} />
        <SidebarItem icon={Users} label="Quản lý thành viên" active={activeView === "members"} onClick={() => onViewChange("members")} />
        <SidebarItem icon={FileText} label="Dự án" active={activeView === "projects"} onClick={() => onViewChange("projects")} />
        <SidebarItem icon={Hash} label="Yêu cầu" active={activeView === "requests"} onClick={() => onViewChange("requests")} />
        <SidebarItem icon={Bell} label="Hoạt động" active={activeView === "activity"} onClick={() => onViewChange("activity")} />

      </nav>
    </aside>
  );
}

function FriendsPanel({
  user,
  data,
  listSearch,
  addOpen,
  username,
  searchResult,
  activeChat,
  messages,
  chatInput,
  attachment,
  attachmentMenuOpen,
  iconMenuOpen,
  loading,
  onClose,
  onCloseActiveChat,
  onListSearchChange,
  onOpenAdd,
  onCloseAdd,
  onUsernameChange,
  onSearch,
  onSendRequest,
  onRespondRequest,
  onOpenChat,
  onChatInputChange,
  onRemoveAttachment,
  onToggleAttachmentMenu,
  onSelectAttachment,
  onToggleIconMenu,
  onSelectIcon,
  imageInputRef,
  fileInputRef,
  onImageChange,
  onFileChange,
  onSendMessage,
  chatScrollRef,
  messagesEndRef,
  showJumpToLatest,
  onChatScroll,
  onJumpToLatest,
  onPreviewImage,
}) {
  const normalizedSearch = String(listSearch || "").trim().toLowerCase();
  const visibleFriends = data.friends.filter((item) => {
    if (!normalizedSearch) {
      return true;
    }

    return item.friend.fullName?.toLowerCase().includes(normalizedSearch)
      || item.friend.username?.toLowerCase().includes(normalizedSearch);
  });

  function closeChatFromEmptyArea(event) {
    if (activeChat && event.target === event.currentTarget) {
      onCloseActiveChat?.();
    }
  }

  function closeChatFromContactColumn(event) {
    if (!activeChat || event.target.closest("[data-chat-contact]")) {
      return;
    }

    onCloseActiveChat?.();
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden border-r border-white/12 bg-[#100d17]/98">
      <div onMouseDown={closeChatFromContactColumn} className="flex h-full min-h-0 w-80 shrink-0 flex-col border-r border-white/10 bg-black/18">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Tin nhắn</h2>
              <p className="mt-1 text-xs text-white/42">@{user?.username}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full bg-white/10 p-2 text-white/62 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative mt-4 flex gap-2">
            <input
              value={listSearch}
              onChange={(event) => onListSearchChange(event.target.value)}
              className="min-w-0 flex-1 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45"
              placeholder="Tìm bạn bè hoặc boxchat"
            />
            <button type="button" onClick={onOpenAdd} className="rounded-full bg-white/12 px-3 text-white hover:bg-white/18">
              <UserPlus className="h-4 w-4" />
            </button>

            {addOpen && (
              <>
                <div className="fixed inset-0 z-30" role="presentation" onMouseDown={onCloseAdd} />
                <div className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-white/12 bg-[#211327] p-3 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">Thêm bạn bè</div>
                    <button type="button" onClick={onCloseAdd} className="rounded-full bg-white/10 p-1.5 text-white/62 hover:text-white">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <form onSubmit={onSearch} className="flex gap-2">
                    <input
                      value={username}
                      onChange={(event) => onUsernameChange(event.target.value)}
                      className="min-w-0 flex-1 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45"
                      placeholder="Nhập username"
                    />
                    <button type="submit" className="rounded-full bg-white px-3 text-black">
                      <Search className="h-4 w-4" />
                    </button>
                  </form>

                  {searchResult?.user && (
                    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/7 p-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/12 text-sm font-bold text-white">
                        {getWorkspaceInitials(searchResult.user.fullName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">{searchResult.user.fullName}</div>
                        <div className="mt-1 truncate text-xs text-white/45">@{searchResult.user.username}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSendRequest(searchResult.user.username)}
                        disabled={searchResult.relation?.isFriend || searchResult.relation?.outgoingRequest?.status === "PENDING"}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black disabled:opacity-50"
                        title={searchResult.relation?.isFriend ? "Đã là bạn bè" : searchResult.relation?.outgoingRequest?.status === "PENDING" ? "Đã gửi lời mời" : "Kết bạn"}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {data.incomingRequests.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 px-1 text-xs font-semibold uppercase text-white/38">Lời mời</div>
              <div className="space-y-2">
                {data.incomingRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl bg-white/7 p-3">
                    <div className="text-sm font-semibold text-white">{request.requester.fullName}</div>
                    <div className="mt-1 text-xs text-white/45">@{request.requester.username}</div>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => onRespondRequest(request, "accept")} className="flex-1 rounded-full bg-white px-3 py-2 text-xs font-semibold text-black">Chấp nhận</button>
                      <button type="button" onClick={() => onRespondRequest(request, "decline")} className="flex-1 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white/70">Từ chối</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-2 px-1 text-xs font-semibold uppercase text-white/38">Boxchat</div>
          <div className="space-y-2">
            {data.friends.length === 0 ? (
              <div className="rounded-2xl bg-white/7 p-3 text-sm text-white/45">Chưa có bạn bè.</div>
            ) : visibleFriends.length === 0 ? (
              <div className="rounded-2xl bg-white/7 p-3 text-sm text-white/45">Không tìm thấy boxchat.</div>
            ) : (
              visibleFriends.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-chat-contact
                  onClick={() => onOpenChat(item.friend)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-white/10 ${
                    activeChat?.id === item.friend.id ? "border border-white/12 bg-white/14 text-white" : "bg-white/7 text-white"
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${activeChat?.id === item.friend.id ? "bg-[#f5f7fb] text-black" : "bg-white/12 text-white"}`}>
                    {getWorkspaceInitials(item.friend.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{item.friend.fullName}</div>
                    <div className={`truncate text-xs ${activeChat?.id === item.friend.id ? "text-white/55" : "text-white/42"}`}>
                      {formatLatestMessage(item.latestMessage, user?.id, item.friend.username)}
                    </div>
                  </div>
                  {item.unreadCount > 0 && (
                    <span className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${activeChat?.id === item.friend.id ? "bg-[#f5f7fb] text-black" : "bg-red-500 text-white"}`}>
                      {item.unreadCount > 9 ? "9+" : item.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div onMouseDown={closeChatFromEmptyArea} className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {activeChat ? (
          <>
            <div className="border-b border-white/10 bg-black/18 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-sm font-bold text-white">
                  {getWorkspaceInitials(activeChat.fullName)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold text-white">{activeChat.fullName}</div>
                  <div className="mt-1 truncate text-xs text-white/42">@{activeChat.username}</div>
                </div>
              </div>
            </div>
            <div ref={chatScrollRef} onMouseDown={closeChatFromEmptyArea} onScroll={onChatScroll} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5">
              {loading ? (
                <div className="text-sm text-white/45">Đang tải tin nhắn...</div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-sm text-white/45">
                  Chưa có tin nhắn. Gửi tin đầu tiên để bắt đầu trao đổi.
                </div>
              ) : (
                messages.map((message) => {
                  const mine = message.senderId === user?.id;
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[min(34rem,78%)] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${mine ? "bg-[#e8edf4] text-[#111827]" : "bg-white/10 text-white"}`}>
                        {message.attachmentData && (
                          <ChatAttachment message={message} mine={mine} onPreviewImage={onPreviewImage} />
                        )}
                        {message.content && <div className={`${message.attachmentData ? "mt-2" : ""} whitespace-pre-wrap break-words`}>{message.content}</div>}
                        <div className={`mt-1 text-[10px] ${mine ? "text-[#111827]/45" : "text-white/35"}`}>
                          {formatNotificationTime(message.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            {showJumpToLatest && (
              <button
                type="button"
                onClick={onJumpToLatest}
                className="chat-jump-latest absolute bottom-16 left-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-white/16 bg-white text-black shadow-2xl"
                title="Nhảy tới tin nhắn mới nhất"
                aria-label="Nhảy tới tin nhắn mới nhất"
              >
                <ArrowDown className="h-5 w-5" />
              </button>
            )}
            <form onSubmit={onSendMessage} className="shrink-0 border-t border-white/10 bg-black/20 p-4">
              {attachment && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-3 py-2 text-sm text-white/72">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    {attachment.type === "IMAGE" ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    <span className="truncate">{attachment.name}</span>
                  </span>
                  <button type="button" onClick={onRemoveAttachment} className="rounded-full bg-white/10 p-1 text-white/60 hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="relative">
                  <button type="button" onClick={onToggleAttachmentMenu} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/72 hover:bg-white/15">
                    <Paperclip className="h-4 w-4" />
                  </button>
                  {attachmentMenuOpen && (
                    <div className="absolute bottom-14 left-0 z-50 w-64 rounded-2xl border border-white/10 bg-[#121b25] p-3 shadow-2xl">
                      <button type="button" onClick={() => onSelectAttachment("IMAGE")} className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-base text-white hover:bg-white/8">
                        <Image className="h-6 w-6 text-white/82" />
                        Photo or video
                      </button>
                      <button type="button" onClick={() => onSelectAttachment("FILE")} className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-base text-white hover:bg-white/8">
                        <FileText className="h-6 w-6 text-white/82" />
                        Document
                      </button>
                    </div>
                  )}
                </div>
                <textarea
                  value={chatInput}
                  onChange={(event) => onChatInputChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      if (chatInput.trim() || attachment) {
                        onSendMessage(event);
                      }
                    }
                  }}
                  rows={1}
                  className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45"
                  placeholder="Nhập tin nhắn (Enter để gửi, Shift+Enter để xuống dòng)"
                />
                <div className="relative">
                  <button
                    type="button"
                    onClick={onToggleIconMenu}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-blue-300 transition hover:bg-white/10 hover:text-blue-200"
                    title="Chọn icon"
                    aria-label="Chọn icon"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  {iconMenuOpen && (
                    <EmojiPicker
                      onSelect={onSelectIcon}
                      onClose={onToggleIconMenu}
                    />
                  )}
                </div>
                <button type="submit" disabled={!chatInput.trim() && !attachment} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black disabled:cursor-not-allowed disabled:opacity-40">
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <input ref={imageInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={onImageChange} />
              <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <div className="rounded-2xl border border-white/10 bg-white/6 px-6 py-5 text-sm font-medium text-white/55">
              Vui lòng chọn boxchat để xem tin nhắn.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkspaceTopbar({
  workspaces = [],
  selectedWorkspace,
  requests = [],
  projects = [],
  friends = [],
  notifications,
  unreadCount,
  notificationOpen,
  onToggleNotifications,
  onMarkRead,
  onMarkAllRead,
  onSearchResult,
  updateAvailable,
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const searchResults = useMemo(() => {
    const items = [];

    workspaces.forEach((workspace) => {
      items.push({
        id: `workspace-${workspace.id}`,
        type: "workspace",
        category: "Tên",
        title: workspace.name,
        subtitle: workspace.description || `${workspace.memberCount || 0} thành viên`,
        workspaceId: workspace.id,
      });
    });

    friends.forEach((item) => {
      const friend = item.friend;
      if (!friend) return;
      items.push({
        id: `friend-${friend.id}`,
        type: "friend",
        category: "Tên",
        title: friend.fullName || friend.username,
        subtitle: `@${friend.username}${friend.email ? ` · ${friend.email}` : ""}`,
        friend,
      });
    });

    requests.forEach((request) => {
      items.push({
        id: `request-${request.id}`,
        type: "request",
        category: "Yêu cầu",
        title: request.title || request.subject || request.code || `Yêu cầu #${request.id}`,
        subtitle: [request.code, request.status?.name || request.statusCode, selectedWorkspace?.name].filter(Boolean).join(" · "),
        workspaceId: request.workspaceId || selectedWorkspace?.id,
      });
    });

    projects.forEach((project) => {
      items.push({
        id: `project-${project.id}`,
        type: "project",
        category: "Dự án",
        title: project.name,
        subtitle: [project.code, project.status, project.description].filter(Boolean).join(" · "),
        workspaceId: project.workspaceId || selectedWorkspace?.id,
      });
    });

    if (!normalizedQuery) {
      return [];
    }

    return items
      .filter((item) => [item.title, item.subtitle, item.category].filter(Boolean).join(" ").toLowerCase().includes(normalizedQuery))
      .slice(0, 10);
  }, [friends, normalizedQuery, projects, requests, selectedWorkspace?.id, selectedWorkspace?.name, workspaces]);

  const dropdownOpen = focused && query.trim().length > 0;

  function selectResult(result) {
    setQuery("");
    setFocused(false);
    onSearchResult?.(result);
  }

  return (
    <header className={`flex h-[72px] items-center justify-between gap-4 border-b bg-[#2a0631]/80 px-5 transition-all duration-500 ${updateAvailable ? "border-violet-500 shadow-[0_4px_25px_rgba(139,92,246,0.3)]" : "border-white/10"}`}>
      <div className="hidden w-10 shrink-0 md:block" />
      <div className="relative hidden min-w-0 max-w-2xl flex-1 md:block" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/12 px-4 py-2.5 text-sm text-white/55 focus-within:border-white/35 focus-within:bg-white/15">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/38"
            placeholder="Tìm bạn bè, yêu cầu, dự án..."
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="rounded-full bg-white/10 p-1 text-white/55 hover:text-white" title="Xóa tìm kiếm">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {dropdownOpen && (
          <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-white/12 bg-[#17151c] shadow-2xl">
            <div className="max-h-80 overflow-y-auto p-2">
              {searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectResult(result);
                    }}
                    className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">{result.title}</span>
                      <span className="mt-1 block truncate text-xs text-white/40">{result.subtitle || "Không có mô tả"}</span>
                    </span>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[11px] font-semibold text-white/56">
                      {result.category}
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/42">
                  Không tìm thấy kết quả phù hợp.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {updateAvailable && (
          <button
            type="button"
            onClick={() => {
              if (window.electronAPI) {
                window.electronAPI.startUpdate(
                  updateAvailable.downloadUrl,
                  updateAvailable.version.replace("v", "")
                );
              }
            }}
            className="flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-600/20 px-4 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-600/30 hover:border-violet-400 transition-all shadow-[0_0_12px_rgba(139,92,246,0.35)] animate-pulse mr-2"
            title={`Có bản mới: ${updateAvailable.version}`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Cập nhật {updateAvailable.version}</span>
          </button>
        )}
        <div className="relative" onMouseDown={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={onToggleNotifications}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/7 text-white/70 hover:bg-white/10"
            title="Thông báo"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute bottom-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[#2a0631]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationOpen && (
            <div className="absolute right-0 top-12 z-40 w-[360px] max-w-[calc(100vw-32px)] rounded-2xl border border-white/12 bg-[#211327] p-3 shadow-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <div className="text-sm font-semibold text-white">Thông báo</div>
                  <div className="mt-1 text-xs text-white/42">{unreadCount} thông báo chưa đọc</div>
                </div>
                <button type="button" onClick={onMarkAllRead} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/72 hover:bg-white/15">
                  Đã đọc hết
                </button>
              </div>

              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="rounded-xl bg-white/7 px-3 py-4 text-sm text-white/45">Chưa có thông báo nào.</div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => onMarkRead(notification)}
                      className={`w-full rounded-xl px-3 py-2.5 text-left transition hover:bg-white/10 ${
                        notification.readAt ? "bg-white/5 text-white/54" : "bg-white/10 text-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{notification.title}</div>
                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-white/50">{notification.content}</div>
                        </div>
                        {!notification.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-400" />}
                      </div>
                      <div className="mt-2 text-[11px] text-white/35">{formatNotificationTime(notification.createdAt)}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function WorkspaceSettings({ workspace, user, submitting, onSave }) {
  const isAdmin = Boolean(workspace && (workspace.createdById === user?.id || workspace.currentMemberRole === "ADMIN"));
  const [form, setForm] = useState({
    defaultSlaHours: workspace.defaultSlaHours || "",
    allowRequesterDueDateOverride: workspace.allowRequesterDueDateOverride !== false,
    logo: workspace.logoData
      ? { name: workspace.logoName || "workspace-logo", mime: workspace.logoMime || "image/png", data: workspace.logoData }
      : null,
  });
  const [localError, setLocalError] = useState("");
  const [requestTypes, setRequestTypes] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [typeForm, setTypeForm] = useState({ id: null, name: "", code: "", description: "", defaultPriorityId: "" });
  const [typeSubmitting, setTypeSubmitting] = useState(false);

  useEffect(() => {
    setForm({
      defaultSlaHours: workspace.defaultSlaHours || "",
      allowRequesterDueDateOverride: workspace.allowRequesterDueDateOverride !== false,
      logo: workspace.logoData
        ? { name: workspace.logoName || "workspace-logo", mime: workspace.logoMime || "image/png", data: workspace.logoData }
        : null,
    });
    setLocalError("");
  }, [workspace.id, workspace.defaultSlaHours, workspace.allowRequesterDueDateOverride, workspace.logoData, workspace.logoMime, workspace.logoName]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    loadWorkspaceRequestTypes();
  }, [isAdmin, workspace.id]);

  async function loadWorkspaceRequestTypes() {
    try {
      const [typesResponse, prioritiesResponse] = await Promise.all([
        api.get(`/request-types?includeInactive=1&workspaceId=${workspace.id}`),
        api.get("/catalog/priorities"),
      ]);
      setRequestTypes(typesResponse.data.data || []);
      setPriorities(prioritiesResponse.data.data || []);
    } catch (err) {
      setLocalError(getErrorMessage(err));
    }
  }

  function handleLogoFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setLocalError("Logo phải là file ảnh.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLocalError("Logo tối đa 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        logo: {
          name: file.name,
          mime: file.type || "image/png",
          data: String(reader.result || ""),
        },
      }));
      setLocalError("");
    };
    reader.readAsDataURL(file);
  }

  function submitSettings(event) {
    event.preventDefault();
    const normalizedSla = form.defaultSlaHours === "" ? null : Number(form.defaultSlaHours);

    if (normalizedSla !== null && (!Number.isInteger(normalizedSla) || normalizedSla < 1 || normalizedSla > 8760)) {
      setLocalError("SLA mặc định phải từ 1 đến 8760 giờ.");
      return;
    }

    setLocalError("");
    onSave({
      defaultSlaHours: normalizedSla,
      allowRequesterDueDateOverride: form.allowRequesterDueDateOverride,
      logo: form.logo,
    });
  }

  function editWorkspaceRequestType(type) {
    if (!type.workspaceId) {
      return;
    }

    setTypeForm({
      id: type.id,
      name: type.name || "",
      code: type.code || "",
      description: type.description || "",
      defaultPriorityId: type.defaultPriorityId || "",
    });
    setLocalError("");
  }

  function resetWorkspaceRequestTypeForm() {
    setTypeForm({ id: null, name: "", code: "", description: "", defaultPriorityId: "" });
    setLocalError("");
  }

  async function saveWorkspaceRequestType() {
    setLocalError("");

    if (!typeForm.name.trim() || !typeForm.code.trim()) {
      setLocalError("Tên và mã loại yêu cầu là bắt buộc.");
      return;
    }

    setTypeSubmitting(true);

    try {
      if (typeForm.id) {
        await api.put(`/request-types/${typeForm.id}`, {
          name: typeForm.name,
          description: typeForm.description,
          defaultPriorityId: typeForm.defaultPriorityId,
        });
      } else {
        await api.post("/request-types", {
          ...typeForm,
          workspaceId: workspace.id,
        });
      }
      setTypeForm({ id: null, name: "", code: "", description: "", defaultPriorityId: "" });
      await loadWorkspaceRequestTypes();
    } catch (err) {
      setLocalError(getErrorMessage(err));
    } finally {
      setTypeSubmitting(false);
    }
  }

  async function toggleWorkspaceRequestType(type) {
    if (!type.workspaceId) {
      return;
    }

    setTypeSubmitting(true);
    setLocalError("");

    try {
      await api.patch(`/request-types/${type.id}/status`, { isActive: !type.isActive });
      await loadWorkspaceRequestTypes();
    } catch (err) {
      setLocalError(getErrorMessage(err));
    } finally {
      setTypeSubmitting(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-5xl rounded-[28px] border border-white/10 bg-white/7 p-6">
        <div className="text-lg font-semibold text-white">Cấu hình workspace</div>
        <div className="mt-2 text-sm text-white/50">Chỉ admin workspace có quyền chỉnh cấu hình.</div>
      </div>
    );
  }

  return (
    <form onSubmit={submitSettings} className="mx-auto w-full max-w-6xl">
      <div className="rounded-[28px] border border-white/10 bg-white/7 p-5">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Cấu hình workspace</h2>
            <div className="mt-1 text-sm text-white/45">Quản lý SLA mặc định, logo và các thiết lập dùng riêng cho workspace này.</div>
          </div>
          <button type="submit" disabled={submitting} className="app-button inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60">
            <Save className="h-4 w-4" />
            {submitting ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-2xl border border-white/10 bg-black/18 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-white/10">
                {form.logo?.data ? (
                  <img src={form.logo.data} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white">{getWorkspaceInitials(workspace.name)}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{workspace.name}</div>
                <div className="mt-1 text-xs text-white/42">{form.logo?.name || "Chưa có logo riêng"}</div>
              </div>
            </div>

            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-3 text-sm font-semibold text-white/72 hover:bg-white/12">
              <Image className="h-4 w-4" />
              Chọn logo
              <input type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
            </label>
            {form.logo && (
              <button type="button" onClick={() => setForm((current) => ({ ...current, logo: null }))} className="mt-2 w-full rounded-full border border-white/12 px-4 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/8">
                Gỡ logo
              </button>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/18 p-4">
            <div className="text-sm font-semibold text-white">SLA mặc định</div>
            <div className="mt-1 text-sm text-white/45">Khi tạo yêu cầu trong workspace, hạn xử lý sẽ tự tính theo số giờ này.</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label>
                <span className="text-xs font-semibold uppercase text-white/42">Số giờ SLA</span>
                <input
                  type="number"
                  min="1"
                  max="8760"
                  value={form.defaultSlaHours}
                  onChange={(event) => setForm((current) => ({ ...current, defaultSlaHours: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-white/45"
                  placeholder="Ví dụ: 48"
                />
              </label>
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <div className="text-xs font-semibold uppercase text-white/38">Hạn dự kiến</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {form.defaultSlaHours ? formatShortDate(getDateInputAfterHours(Number(form.defaultSlaHours))) : "Theo ngày hiện tại"}
                </div>
                <div className="mt-1 text-xs text-white/42">
                  {form.defaultSlaHours ? formatSlaHours(Number(form.defaultSlaHours)) : "Chưa đặt SLA mặc định"}
                </div>
              </div>
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/6 p-4 text-sm text-white/68">
              <input
                type="checkbox"
                checked={form.allowRequesterDueDateOverride}
                onChange={(event) => setForm((current) => ({ ...current, allowRequesterDueDateOverride: event.target.checked }))}
                className="mt-1"
              />
              <span>
                <span className="block font-semibold text-white">Cho phép người tạo sửa hạn xử lý</span>
                <span className="mt-1 block text-xs leading-5 text-white/45">Tắt lựa chọn này nếu admin muốn mọi yêu cầu trong workspace đi theo SLA mặc định.</span>
              </span>
            </label>
          </section>
        </div>

        <section className="mt-4 rounded-2xl border border-white/10 bg-black/18 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Loại yêu cầu của workspace</div>
              <div className="mt-1 text-sm text-white/45">Admin workspace có thể tạo loại yêu cầu riêng để member chọn khi gửi yêu cầu.</div>
            </div>
            <button
              type="button"
              onClick={saveWorkspaceRequestType}
              disabled={typeSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {typeSubmitting ? "Đang lưu..." : typeForm.id ? "Lưu loại yêu cầu" : "Tạo loại yêu cầu"}
            </button>
            {typeForm.id && (
              <button
                type="button"
                onClick={resetWorkspaceRequestTypeForm}
                className="inline-flex items-center justify-center rounded-full border border-white/12 px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10"
              >
                H?y s?a
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label>
              <span className="text-xs font-semibold uppercase text-white/42">Tên loại</span>
              <input
                value={typeForm.name}
                onChange={(event) => setTypeForm((current) => ({ ...current, name: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-white/12 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45"
                placeholder="Ví dụ: Hỗ trợ tài khoản"
              />
            </label>
            <label>
              <span className="text-xs font-semibold uppercase text-white/42">Mã loại</span>
              <input
                value={typeForm.code}
                onChange={(event) => setTypeForm((current) => ({ ...current, code: normalizeRequestTypeCode(event.target.value) }))}
                disabled={Boolean(typeForm.id)}
                className="mt-2 w-full rounded-2xl border border-white/12 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45"
                placeholder="HO_TRO_TAI_KHOAN"
              />
            </label>
            <label>
              <span className="text-xs font-semibold uppercase text-white/42">Ưu tiên mặc định</span>
              <select
                value={typeForm.defaultPriorityId}
                onChange={(event) => setTypeForm((current) => ({ ...current, defaultPriorityId: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-white/12 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-white/45"
              >
                <option value="">Không đặt</option>
                {priorities.map((priority) => <option key={priority.id} value={priority.id}>{priority.name}</option>)}
              </select>
            </label>
            <label>
              <span className="text-xs font-semibold uppercase text-white/42">Mô tả</span>
              <input
                value={typeForm.description}
                onChange={(event) => setTypeForm((current) => ({ ...current, description: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-white/12 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45"
                placeholder="Mô tả ngắn"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {requestTypes.map((type) => (
              <div key={type.id} className={`rounded-2xl border p-3 ${type.isActive ? "border-white/10 bg-white/6" : "border-white/8 bg-white/[0.03] opacity-65"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{type.name}</div>
                    <div className="mt-1 truncate font-mono text-xs text-white/38">{type.code}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${type.workspaceId ? "bg-violet-400/16 text-violet-100" : "bg-white/10 text-white/55"}`}>
                    {type.workspaceId ? type.isActive ? "Workspace" : "Đã khóa" : "Chung"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-white/45">{type.defaultPriority?.name || "Chưa đặt ưu tiên mặc định"}</div>
                {type.workspaceId ? (
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => editWorkspaceRequestType(type)} className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-white/68 hover:bg-white/10">
                      S?a
                    </button>
                    <button type="button" onClick={() => toggleWorkspaceRequestType(type)} className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-white/68 hover:bg-white/10">
                      {type.isActive ? "Khóa" : "Mở lại"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-white/32">Loại chung do admin hệ thống quản lý.</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {localError && <div className="mt-4 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">{localError}</div>}
      </div>
    </form>
  );
}

function WorkspaceMembers({ workspace, user, submitting, onInvite, onRoleChange, onRemove, onDirectMessage }) {
  const members = (workspace.members || []).filter((member) => member.status === "ACTIVE");
  const canManage = workspace.createdById === user?.id || workspace.currentMemberRole === "ADMIN";
  const memberGridColumns = canManage ? "grid-cols-[1.3fr_1fr_140px_230px]" : "grid-cols-[1.3fr_1fr_140px]";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="rounded-[28px] border border-white/10 bg-white/7 p-5">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Quản lý thành viên</h2>
            <div className="mt-1 text-sm text-white/45">{members.length} thành viên đang hoạt động</div>
          </div>
          <button type="button" onClick={onInvite} className="app-button inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm">
            <UserPlus className="h-4 w-4" />
            Mời thành viên
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
          <div className={`grid ${memberGridColumns} gap-4 border-b border-white/10 bg-white/6 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/38`}>
            <div>Thành viên</div>
            <div>Email</div>
            <div>Vai trò</div>
            {canManage && <div className="text-right">Thao tác</div>}
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {members.map((member) => {
              const isCreator = workspace.createdById === member.userId;
              const isSelf = member.userId === user?.id;
              const canEditMember = canManage && !isCreator;

              return (
                <div key={member.id} className={`grid ${memberGridColumns} items-center gap-4 border-b border-white/8 px-4 py-3 last:border-b-0`}>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{member.user?.fullName || "Chưa có tên"}</div>
                    <div className="mt-1 truncate text-xs text-white/42">@{member.user?.username || "unknown"} · {formatShortDate(member.joinedAt)}</div>
                  </div>
                  <div className="truncate text-sm text-white/58">{member.user?.email || "-"}</div>
                  <div>
                    {canEditMember ? (
                      <select
                        value={member.role}
                        disabled={submitting}
                        onChange={(event) => onRoleChange(member, event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                      </select>
                    ) : (
                      <span className="inline-flex rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/70">{member.role}</span>
                    )}
                  </div>
                  {canManage && (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={isSelf}
                      onClick={() => onDirectMessage(member)}
                      className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-white/72 hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:bg-transparent"
                    >
                      Nhắn tin
                    </button>
                    <button
                      type="button"
                      disabled={!canEditMember || isSelf || submitting}
                      onClick={() => onRemove(member)}
                      className="rounded-full border border-red-300/20 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-500/12 disabled:cursor-not-allowed disabled:border-white/8 disabled:text-white/25 disabled:hover:bg-transparent"
                    >
                      Xóa
                    </button>
                  </div>
                  )}
                </div>
              );
            })}

            {!members.length && (
              <div className="p-6 text-sm text-white/45">Workspace chưa có thành viên đang hoạt động.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkspacePlannedView({ view }) {
  const titleByView = {
    projects: "Dự án",
    activity: "Hoạt động",
  };

  return (
    <div className="mx-auto flex min-h-[420px] w-full max-w-4xl items-center justify-center rounded-[28px] border border-white/10 bg-white/7 p-8 text-center">
      <div>
        <div className="text-xl font-semibold text-white">{titleByView[view] || "Workspace"}</div>
        <div className="mt-2 text-sm text-white/45">Mục này nằm trong các đợt tiếp theo của kế hoạch workspace.</div>
      </div>
    </div>
  );
}

const projectStatusMeta = {
  ACTIVE: { label: "Đang chạy", className: "bg-emerald-400/16 text-emerald-100" },
  PAUSED: { label: "Tạm dừng", className: "bg-amber-400/16 text-amber-100" },
  ARCHIVED: { label: "Lưu trữ", className: "bg-white/10 text-white/45" },
  CLOSED: { label: "Đã đóng", className: "bg-sky-400/16 text-sky-100" },
};

const projectWorkItemStatuses = [
  { code: "TODO", label: "To do", hint: "Việc đã sẵn sàng để kéo vào sprint." },
  { code: "IN_PROGRESS", label: "In progress", hint: "Đang phân tích, code hoặc xử lý." },
  { code: "REVIEW", label: "Ready for review", hint: "Đã xong phần làm, đang chờ review/test." },
  { code: "DONE", label: "Done", hint: "Đã hoàn thành và chấp nhận." },
  { code: "BLOCKED", label: "Blocked", hint: "Bị chặn do thiếu thông tin hoặc phụ thuộc." },
];

const projectWorkItemTypeLabels = {
  STORY: "Story",
  TASK: "Task",
  SUB_TASK: "Sub-task",
};

const projectWorkItemPriorityLabels = {
  LOW: "Thấp",
  MEDIUM: "Vừa",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};

function WorkspaceProjects({ workspace, user }) {
  const canManage = workspace.currentMemberRole === "ADMIN";
  const [projectStep, setProjectStep] = useState("board");
  const [showOldProjects, setShowOldProjects] = useState(false);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [workItemFormOpen, setWorkItemFormOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [workItems, setWorkItems] = useState([]);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [form, setForm] = useState({ name: "", code: "", description: "", startDate: "", dueDate: "" });
  const [workItemForm, setWorkItemForm] = useState({ type: "TASK", title: "", description: "", parentId: "", assignedToId: "", priority: "MEDIUM", startDate: "", dueDate: "" });
  const [workLogForm, setWorkLogForm] = useState({ minutes: "", note: "", workedAt: getTodayInputDate() });
  const [extensionForm, setExtensionForm] = useState({ dueDate: "", reason: "" });
  const [closeReason, setCloseReason] = useState("");
  const [pageForm, setPageForm] = useState({ title: "", parentId: "", content: "" });
  const [loading, setLoading] = useState(true);
  const [workItemsLoading, setWorkItemsLoading] = useState(false);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingWorkItem, setSavingWorkItem] = useState(false);
  const [savingWorkLog, setSavingWorkLog] = useState(false);
  const [lifecycleSubmitting, setLifecycleSubmitting] = useState(false);
  const [savingPage, setSavingPage] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const selectedWorkItem = workItems.find((item) => item.id === selectedWorkItemId);
  const selectedPage = pages.find((page) => page.id === selectedPageId);
  const canManageSelectedProject = canManage || selectedProject?.createdById === user?.id;
  const activeMembers = workspace.members?.filter((member) => member.status === "ACTIVE") || [];
  const projectProgress = getProjectProgress(selectedProject);
  const projectDueState = getProjectDueState(selectedProject);
  const completedTimeline = workItems
    .filter((item) => item.status === "DONE")
    .sort((a, b) => new Date(b.completedAt || b.updatedAt || 0) - new Date(a.completedAt || a.updatedAt || 0))
    .slice(0, 8);
  const projectLoggedMinutes = workItems.reduce((total, item) => total + getWorkItemLoggedMinutes(item), 0);
  const activeProjects = projects.filter((project) => !isOldProject(project));
  const oldProjects = projects.filter((project) => isOldProject(project));
  const visibleProjects = showOldProjects ? oldProjects : activeProjects;
  const parentWorkItems = getAllowedProjectWorkItemParents(workItems, workItemForm.type, selectedWorkItemId);

  useEffect(() => {
    loadProjects();
  }, [workspace.id]);

  useEffect(() => {
    if (selectedProjectId) {
      loadPages(selectedProjectId);
      loadWorkItems(selectedProjectId);
    } else {
      setPages([]);
      setSelectedPageId(null);
      setWorkItems([]);
      setSelectedWorkItemId(null);
      resetPageForm();
      resetWorkItemForm();
    }
  }, [selectedProjectId]);

  async function loadProjects() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/projects?workspaceId=${workspace.id}`);
      const items = response.data.data || [];
      setProjects(items);

      if (selectedProjectId && !items.some((item) => item.id === selectedProjectId)) {
        setSelectedProjectId(null);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadPages(projectId = selectedProjectId) {
    if (!projectId) return;

    setPagesLoading(true);
    setError("");

    try {
      const response = await api.get(`/projects/${projectId}/pages`);
      const items = response.data.data || [];
      setPages(items);

      if (selectedPageId && !items.some((item) => item.id === selectedPageId)) {
        setSelectedPageId(null);
        resetPageForm();
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setPages([]);
    } finally {
      setPagesLoading(false);
    }
  }

  async function loadWorkItems(projectId = selectedProjectId) {
    if (!projectId) return;

    setWorkItemsLoading(true);
    setError("");

    try {
      const response = await api.get(`/projects/${projectId}/work-items`);
      const items = response.data.data || [];
      setWorkItems(items);

      if (selectedWorkItemId && !items.some((item) => item.id === selectedWorkItemId)) {
        setSelectedWorkItemId(null);
        resetWorkItemForm();
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setWorkItems([]);
    } finally {
      setWorkItemsLoading(false);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: field === "code" ? normalizeProjectCode(value) : value,
      ...(field === "name" && !selectedProjectId && !current.code ? { code: normalizeProjectCode(value) } : {}),
    }));
  }

  function selectProject(project) {
    setSelectedProjectId(project.id);
    setProjectStep("board");
    setSelectedPageId(null);
    setSelectedWorkItemId(null);
    setPages([]);
    setWorkItems([]);
    resetPageForm();
    resetWorkItemForm();
    setForm({
      name: project.name || "",
      code: project.code || "",
      description: project.description || "",
      startDate: toDateInputValue(project.startDate),
      dueDate: toDateInputValue(project.dueDate),
    });
    setExtensionForm({ dueDate: toDateInputValue(project.dueDate), reason: "" });
    setCloseReason("");
    setMessage("");
    setError("");
  }

  function resetForm() {
    setSelectedProjectId(null);
    setProjectStep("board");
    setForm({ name: "", code: "", description: "", startDate: "", dueDate: "" });
    setPages([]);
    setWorkItems([]);
    setSelectedPageId(null);
    setSelectedWorkItemId(null);
    resetPageForm();
    resetWorkItemForm();
    setExtensionForm({ dueDate: "", reason: "" });
    setCloseReason("");
    setMessage("");
    setError("");
  }

  function selectPage(page) {
    setSelectedPageId(page.id);
    setPageForm({
      title: page.title || "",
      parentId: page.parentId ? String(page.parentId) : "",
      content: page.content || "",
    });
    setMessage("");
    setError("");
  }

  function resetPageForm() {
    setSelectedPageId(null);
    setPageForm({ title: "", parentId: "", content: "" });
  }

  function selectWorkItem(item) {
    setSelectedWorkItemId(item.id);
    setWorkLogForm({ minutes: "", note: "", workedAt: getTodayInputDate() });
    setWorkItemForm({
      type: item.type || "TASK",
      title: item.title || "",
      description: item.description || "",
      parentId: item.parentId ? String(item.parentId) : "",
      assignedToId: item.assignedToId ? String(item.assignedToId) : "",
      priority: item.priority || "MEDIUM",
      startDate: toDateInputValue(item.startDate),
      dueDate: toDateInputValue(item.dueDate),
    });
    setMessage("");
    setError("");
  }

  function openCreateWorkItemForm(type = "TASK") {
    setSelectedWorkItemId(null);
    setWorkItemForm({ type, title: "", description: "", parentId: "", assignedToId: "", priority: "MEDIUM", startDate: "", dueDate: "" });
    setWorkLogForm({ minutes: "", note: "", workedAt: getTodayInputDate() });
    setMessage("");
    setError("");
    setWorkItemFormOpen(true);
  }

  function openEditWorkItemForm() {
    if (!selectedWorkItem) return;
    selectWorkItem(selectedWorkItem);
    setWorkItemFormOpen(true);
  }

  function updateWorkItemType(type) {
    setWorkItemForm((current) => {
      const allowedParents = getAllowedProjectWorkItemParents(workItems, type, selectedWorkItemId);
      const parentStillValid = current.parentId && allowedParents.some((item) => String(item.id) === String(current.parentId));

      return {
        ...current,
        type,
        parentId: parentStillValid ? current.parentId : "",
      };
    });
  }

  function resetWorkItemForm() {
    setSelectedWorkItemId(null);
    setWorkItemForm({ type: "TASK", title: "", description: "", parentId: "", assignedToId: "", priority: "MEDIUM", startDate: "", dueDate: "" });
    setWorkLogForm({ minutes: "", note: "", workedAt: getTodayInputDate() });
    setWorkItemFormOpen(false);
  }

  async function submitProject(event) {
    event.preventDefault();

    if (!canManage) return false;

    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      if (selectedProject) {
        await api.put(`/projects/${selectedProject.id}`, {
          name: form.name,
          description: form.description,
          startDate: form.startDate || null,
          dueDate: form.dueDate || null,
        });
        setMessage("Đã cập nhật dự án.");
      } else {
        await api.post("/projects", {
          workspaceId: workspace.id,
          name: form.name,
          code: form.code,
          description: form.description,
          startDate: form.startDate || null,
          dueDate: form.dueDate || null,
        });
        setMessage("Đã tạo dự án mới.");
        setForm({ name: "", code: "", description: "", startDate: "", dueDate: "" });
      }

      await loadProjects();
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(project, status) {
    if (!canManage) return;

    setMessage("");
    setError("");

    try {
      await api.patch(`/projects/${project.id}/status`, { status });
      setMessage("Đã cập nhật trạng thái dự án.");
      await loadProjects();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function submitWorkItem(event) {
    event.preventDefault();

    if (!selectedProject || selectedProject.status === "CLOSED" || selectedProject.status === "ARCHIVED") return;

    setSavingWorkItem(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        type: workItemForm.type,
        title: workItemForm.title,
        description: workItemForm.description,
        parentId: workItemForm.parentId ? Number(workItemForm.parentId) : null,
        assignedToId: workItemForm.assignedToId ? Number(workItemForm.assignedToId) : null,
        priority: workItemForm.priority,
        startDate: workItemForm.startDate || null,
        dueDate: workItemForm.dueDate || null,
      };

      if (selectedWorkItem) {
        await api.put(`/projects/${selectedProject.id}/work-items/${selectedWorkItem.id}`, payload);
        setMessage("Đã cập nhật công việc.");
      } else {
        await api.post(`/projects/${selectedProject.id}/work-items`, payload);
        setMessage("Đã tạo công việc mới.");
        resetWorkItemForm();
      }

      await loadWorkItems(selectedProject.id);
      await loadProjects();
      setWorkItemFormOpen(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingWorkItem(false);
    }
  }

  async function changeWorkItemStatus(item, status) {
    if (!selectedProject) return;

    setMessage("");
    setError("");

    try {
      await api.patch(`/projects/${selectedProject.id}/work-items/${item.id}/status`, { status });
      await loadWorkItems(selectedProject.id);
      await loadProjects();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function submitWorkLog(event) {
    event.preventDefault();

    if (!selectedProject || !selectedWorkItem) return;

    setSavingWorkLog(true);
    setMessage("");
    setError("");

    try {
      const response = await api.post(`/projects/${selectedProject.id}/work-items/${selectedWorkItem.id}/work-logs`, {
        minutes: Number(workLogForm.minutes),
        note: workLogForm.note,
        workedAt: workLogForm.workedAt || null,
      });
      const updatedItem = response.data.data;
      setWorkItems((current) => current.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
      setSelectedWorkItemId(updatedItem.id);
      setWorkLogForm({ minutes: "", note: "", workedAt: getTodayInputDate() });
      setMessage("Đã ghi logwork cho task.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingWorkLog(false);
    }
  }

  async function extendSelectedProject(event) {
    event.preventDefault();

    if (!selectedProject || !canManageSelectedProject) return;

    setLifecycleSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await api.patch(`/projects/${selectedProject.id}/extend`, {
        dueDate: extensionForm.dueDate,
        reason: extensionForm.reason,
      });
      setProjects((current) => current.map((project) => (project.id === selectedProject.id ? response.data.data : project)));
      setMessage("Đã gia hạn dự án.");
      setExtensionForm({ dueDate: toDateInputValue(response.data.data?.dueDate), reason: "" });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLifecycleSubmitting(false);
    }
  }

  async function closeSelectedProject(event) {
    event.preventDefault();

    if (!selectedProject || !canManageSelectedProject) return;

    setLifecycleSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await api.patch(`/projects/${selectedProject.id}/close`, { reason: closeReason });
      setProjects((current) => current.map((project) => (project.id === selectedProject.id ? response.data.data : project)));
      setMessage("Đã đóng dự án.");
      setCloseReason("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLifecycleSubmitting(false);
    }
  }

  async function submitPage(event) {
    event.preventDefault();

    if (!canManage || !selectedProject) return;

    setSavingPage(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        title: pageForm.title,
        parentId: pageForm.parentId ? Number(pageForm.parentId) : null,
        content: pageForm.content,
      };

      if (selectedPage) {
        await api.put(`/projects/${selectedProject.id}/pages/${selectedPage.id}`, payload);
        setMessage("Đã cập nhật tài liệu dự án.");
      } else {
        await api.post(`/projects/${selectedProject.id}/pages`, payload);
        setMessage("Đã tạo tài liệu dự án.");
        resetPageForm();
      }

      await loadPages(selectedProject.id);
      await loadProjects();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingPage(false);
    }
  }

  async function archivePage(page) {
    if (!canManage || !selectedProject) return;

    setMessage("");
    setError("");

    try {
      await api.patch(`/projects/${selectedProject.id}/pages/${page.id}/archive`);
      setMessage("Đã lưu trữ tài liệu dự án.");
      resetPageForm();
      await loadPages(selectedProject.id);
      await loadProjects();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto w-full max-w-none">
      <section className="rounded-[28px] border border-white/10 bg-white/7 p-5">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            {selectedProject && (
              <button type="button" onClick={resetForm} className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white/75 hover:bg-white/12">
                <ArrowLeft className="h-4 w-4" />
                Chọn dự án khác
              </button>
            )}
            <h2 className="text-xl font-semibold text-white">{selectedProject ? selectedProject.name : "Chọn dự án"}</h2>
            <div className="mt-1 text-sm text-white/45">
              {selectedProject
                ? `${selectedProject.code} · ${selectedProject.description || "Chưa có mô tả dự án."}`
                : "Chọn một dự án để vào dashboard chính, hoặc tạo dự án mới bằng nút phía trên danh sách."}
            </div>
          </div>
          {selectedProject ? (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${projectDueState.className}`}>
              {projectDueState.label}
            </span>
          ) : (
            <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/56">
              {loading ? "Đang tải" : `${projects.length} dự án`}
            </div>
          )}
        </div>

        {(message || error) && (
          <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${error ? "bg-red-500/15 text-red-100" : "bg-emerald-500/15 text-emerald-100"}`}>
            {error || message}
          </div>
        )}

        {selectedProject && <ProjectStepTabs activeStep={projectStep} onChange={setProjectStep} />}
      </section>

      {!selectedProject && (
      <section className="mt-5 rounded-[28px] border border-white/10 bg-white/7 p-5">
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/18 p-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-white">{showOldProjects ? "Dự án cũ" : "Dự án đang theo dõi"}</div>
            <div className="mt-1 text-xs text-white/42">
              {showOldProjects
                ? "Gồm dự án đã đóng, lưu trữ hoặc đã quá hạn."
                : "Ẩn dự án đã đóng, lưu trữ và quá hạn để tập trung vào dự án đang chạy."}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setProjectFormOpen(true);
                }}
                className="app-button inline-flex items-center justify-center gap-2 px-4 py-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                Tạo dự án
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowOldProjects((current) => !current)}
              className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white/72 hover:bg-white/12"
            >
              {showOldProjects ? `Xem dự án đang chạy (${activeProjects.length})` : `Xem dự án cũ (${oldProjects.length})`}
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleProjects.map((project) => {
              const meta = projectStatusMeta[project.status] || projectStatusMeta.ACTIVE;
              const dueState = getProjectDueState(project);
              const progress = getProjectProgress(project);
              return (
                <article key={project.id} className={`rounded-2xl border p-4 transition ${selectedProjectId === project.id ? "border-white/28 bg-white/10" : "border-white/10 bg-black/18 hover:bg-white/5"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-mono text-xs font-semibold text-white/42">{project.code}</div>
                      <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-white">{project.name}</h3>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/55">{project.description || "Chưa có mô tả dự án."}</p>
                  <div className={`mt-4 rounded-2xl border px-3 py-2 text-xs font-semibold ${dueState.className}`}>
                    {dueState.label}
                    {project.dueDate ? ` · hạn ${formatShortDate(project.dueDate)}` : ""}
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-white/45">
                      <span>Tiến độ</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <MiniStat label="Yêu cầu" value={project._count?.requests || 0} />
                    <MiniStat label="Công việc" value={project.workItemSummary?.total || 0} />
                    <MiniStat label="Tài liệu" value={project._count?.pages || 0} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => selectProject(project)} className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-white/68 hover:bg-white/10">Chi tiết</button>
                    {canManage && project.status !== "ACTIVE" && (
                      <button type="button" onClick={() => changeStatus(project, "ACTIVE")} className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-white/68 hover:bg-white/10">Mở lại</button>
                    )}
                    {canManage && project.status === "ACTIVE" && (
                      <button type="button" onClick={() => changeStatus(project, "PAUSED")} className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-white/68 hover:bg-white/10">Tạm dừng</button>
                    )}
                    {canManage && project.status !== "ARCHIVED" && (
                      <button type="button" onClick={() => changeStatus(project, "ARCHIVED")} className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-white/68 hover:bg-white/10">Lưu trữ</button>
                    )}
                  </div>
                </article>
              );
            })}

            {!visibleProjects.length && (
              <div className="rounded-2xl border border-dashed border-white/12 p-8 text-center text-sm text-white/45 md:col-span-2 xl:col-span-3">
                {loading ? "Đang tải dự án..." : showOldProjects ? "Chưa có dự án cũ." : "Chưa có dự án đang chạy."}
              </div>
            )}
        </div>
      </section>
      )}

      {projectFormOpen && (
        <Modal title="Tạo dự án" onClose={() => setProjectFormOpen(false)}>
          <form
            onSubmit={async (event) => {
              const saved = await submitProject(event);
              if (saved) setProjectFormOpen(false);
            }}
            className="space-y-4"
          >
            <p className="text-sm leading-6 text-white/50">Tạo dự án mới để quản lý yêu cầu, công việc, tài liệu và timeline theo từng mục tiêu.</p>
            <WorkspaceFormField label="Tên dự án">
              <input value={form.name} onChange={(event) => updateField("name", event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45" placeholder="Ví dụ: Cổng nội bộ" />
            </WorkspaceFormField>
            <WorkspaceFormField label="Mã dự án">
              <input value={form.code} onChange={(event) => updateField("code", event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45" placeholder="CONG_NOI_BO" />
            </WorkspaceFormField>
            <WorkspaceFormField label="Mô tả">
              <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={4} className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45" placeholder="Mục tiêu, phạm vi hoặc ghi chú quyết định của dự án" />
            </WorkspaceFormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <WorkspaceFormField label="Ngày bắt đầu">
                <input type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none focus:border-white/45" />
              </WorkspaceFormField>
              <WorkspaceFormField label="Deadline">
                <input type="date" value={form.dueDate} onChange={(event) => updateField("dueDate", event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none focus:border-white/45" />
              </WorkspaceFormField>
            </div>
            <button type="submit" disabled={submitting} className="app-button inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm disabled:opacity-60">
              <Save className="h-4 w-4" />
              {submitting ? "Đang lưu..." : "Tạo dự án"}
            </button>
          </form>
        </Modal>
      )}

      {workItemFormOpen && selectedProject && (
        <Modal title={selectedWorkItem ? "Sửa issue" : "Tạo task"} onClose={() => setWorkItemFormOpen(false)}>
          <form
            onSubmit={submitWorkItem}
            className="space-y-4"
          >
            <p className="text-sm leading-6 text-white/50">
              Tạo issue theo cây Story → Task → Sub-task. Task có thể đứng riêng hoặc nằm dưới Story; Sub-task bắt buộc nằm dưới Task.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <WorkspaceFormField label="Loại issue">
                <select value={workItemForm.type} onChange={(event) => updateWorkItemType(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/45">
                  <option value="STORY">Story</option>
                  <option value="TASK">Task</option>
                  <option value="SUB_TASK">Sub-task</option>
                </select>
              </WorkspaceFormField>
              <WorkspaceFormField label="Ưu tiên">
                <select value={workItemForm.priority} onChange={(event) => setWorkItemForm((current) => ({ ...current, priority: event.target.value }))} className="w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/45">
                  <option value="LOW">Thấp</option>
                  <option value="MEDIUM">Vừa</option>
                  <option value="HIGH">Cao</option>
                  <option value="URGENT">Khẩn cấp</option>
                </select>
              </WorkspaceFormField>
            </div>
            <WorkspaceFormField label="Tiêu đề">
              <input value={workItemForm.title} onChange={(event) => setWorkItemForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45" placeholder="Ví dụ: Thiết kế luồng duyệt yêu cầu" />
            </WorkspaceFormField>
            <WorkspaceFormField label="Mô tả">
              <textarea value={workItemForm.description} onChange={(event) => setWorkItemForm((current) => ({ ...current, description: event.target.value }))} rows={4} className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45" placeholder="Mô tả phạm vi, tiêu chí hoàn thành hoặc ghi chú xử lý" />
            </WorkspaceFormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <WorkspaceFormField label="Người xử lý">
                <select value={workItemForm.assignedToId} onChange={(event) => setWorkItemForm((current) => ({ ...current, assignedToId: event.target.value }))} className="w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/45">
                  <option value="">Chưa gán</option>
                  {activeMembers.map((member) => (
                    <option key={member.id} value={member.userId}>{member.user?.fullName || member.user?.username}</option>
                  ))}
                </select>
              </WorkspaceFormField>
              <WorkspaceFormField label="Công việc cha">
                <select
                  value={workItemForm.parentId}
                  disabled={workItemForm.type === "STORY"}
                  onChange={(event) => setWorkItemForm((current) => ({ ...current, parentId: event.target.value }))}
                  className="w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/45 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {workItemForm.type !== "SUB_TASK" && <option value="">Không có</option>}
                  {workItemForm.type === "SUB_TASK" && <option value="">Chọn task cha</option>}
                  {parentWorkItems.map((item) => (
                    <option key={item.id} value={item.id}>{selectedProject.code}-{item.id} · {projectWorkItemTypeLabels[item.type]} · {item.title}</option>
                  ))}
                </select>
              </WorkspaceFormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <WorkspaceFormField label="Start date">
                <input type="date" value={workItemForm.startDate} onChange={(event) => setWorkItemForm((current) => ({ ...current, startDate: event.target.value }))} className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none focus:border-white/45" />
              </WorkspaceFormField>
              <WorkspaceFormField label="Due date">
                <input type="date" value={workItemForm.dueDate} onChange={(event) => setWorkItemForm((current) => ({ ...current, dueDate: event.target.value }))} className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none focus:border-white/45" />
              </WorkspaceFormField>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={savingWorkItem || selectedProject.status === "CLOSED" || selectedProject.status === "ARCHIVED"} className="app-button inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 text-sm disabled:opacity-60">
                <Save className="h-4 w-4" />
                {savingWorkItem ? "Đang lưu..." : selectedWorkItem ? "Lưu issue" : "Tạo issue"}
              </button>
              <button type="button" onClick={() => setWorkItemFormOpen(false)} className="inline-flex flex-1 items-center justify-center rounded-full border border-white/14 bg-white/7 px-5 py-3 text-sm font-semibold text-white/72 hover:bg-white/10">
                Hủy
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selectedProject && projectStep === "board" && (
      <section className="mt-5 rounded-[28px] border border-white/10 bg-white/7 p-5">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">{selectedProject ? selectedProject.name : "Bảng điều hành dự án"}</h2>
            <div className="mt-1 text-sm text-white/45">
              {selectedProject ? `${selectedProject.code} · ${selectedProject.description || "Chưa có mô tả dự án."}` : "Chọn một dự án để xem tiến độ, task, story, sub-task và timeline hoàn thành."}
            </div>
          </div>
          {selectedProject && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${projectDueState.className}`}>
              {projectDueState.label}
            </span>
          )}
        </div>

        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <ProjectMetric label="Progress" value={`${projectProgress}%`} tone="emerald" />
            <ProjectMetric label="Issues" value={workItems.length} />
            <ProjectMetric label="Done" value={workItems.filter((item) => item.status === "DONE").length} tone="emerald" />
            <ProjectMetric label="Overdue" value={workItems.filter((item) => isWorkItemOverdue(item)).length} tone="red" />
            <ProjectMetric label="Logwork" value={formatWorkMinutes(projectLoggedMinutes)} />
            <ProjectMetric label="Yêu cầu" value={selectedProject._count?.requests || 0} />
          </div>

          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Timeline plan</div>
                  <div className="mt-1 text-xs text-white/40">Hiển thị story, task, sub-task theo dạng Jira Plans với ngày bắt đầu, deadline và trạng thái.</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openCreateWorkItemForm("TASK")}
                    disabled={selectedProject.status === "CLOSED" || selectedProject.status === "ARCHIVED"}
                    className="app-button inline-flex items-center justify-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Tạo task
                  </button>
                </div>
                {workItemsLoading && <span className="text-xs text-white/40">Đang tải...</span>}
              </div>
              <ProjectTimelinePlan
                project={selectedProject}
                items={workItems}
                selectedItemId={selectedWorkItemId}
                onSelectItem={selectWorkItem}
                onCreateIssue={() => openCreateWorkItemForm("TASK")}
              />
            </div>

            <aside className="space-y-4">
              <ProjectWorkItemDetail
                project={selectedProject}
                item={selectedWorkItem}
                workLogForm={workLogForm}
                onWorkLogChange={setWorkLogForm}
                onSubmitWorkLog={submitWorkLog}
                savingWorkLog={savingWorkLog}
                onStatusChange={(status) => selectedWorkItem && changeWorkItemStatus(selectedWorkItem, status)}
                onEdit={openEditWorkItemForm}
              />
            </aside>
          </div>
        </div>
      </section>
      )}

      {selectedProject && projectStep === "docs" && (
      <section className="mt-5 rounded-[28px] border border-white/10 bg-white/7 p-5">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
              <BookOpen className="h-5 w-5" />
              Tài liệu dự án
            </h2>
            <div className="mt-1 text-sm text-white/45">
              {selectedProject ? `Không gian ghi chú, quyết định và mô tả cho ${selectedProject.name}.` : "Chọn một dự án để mở cây tài liệu."}
            </div>
          </div>
          {selectedProject && (
            <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/56">
              {pagesLoading ? "Đang tải" : `${pages.length} trang`}
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[260px_1fr_320px]">
            <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white">Cây tài liệu</div>
                {canManage && (
                  <button type="button" onClick={resetPageForm} className="rounded-full border border-white/12 p-2 text-white/70 hover:bg-white/10" title="Tạo trang mới">
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {pages.map((page) => (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => selectPage(page)}
                    className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${selectedPageId === page.id ? "border-white/30 bg-white/12" : "border-white/8 bg-white/5 hover:bg-white/8"}`}
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-white/50" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">{page.title}</span>
                      <span className="mt-1 block truncate text-xs text-white/40">/{page.slug}</span>
                    </span>
                  </button>
                ))}

                {!pages.length && (
                  <div className="rounded-2xl border border-dashed border-white/12 px-4 py-6 text-sm text-white/42">
                    {pagesLoading ? "Đang tải tài liệu..." : "Dự án này chưa có tài liệu."}
                  </div>
                )}
              </div>
            </div>

            <article className="min-h-[420px] rounded-2xl border border-white/10 bg-black/18 p-5">
              {selectedPage ? (
                <div>
                  <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold text-white/38">/{selectedPage.slug}</div>
                      <h3 className="mt-2 text-2xl font-semibold text-white">{selectedPage.title}</h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs text-white/50">
                      <Clock className="h-3.5 w-3.5" />
                      {formatShortDate(selectedPage.updatedAt)}
                    </div>
                  </div>
                  <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-white/68">
                    {selectedPage.content || "Trang này chưa có nội dung."}
                  </div>
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <div className="text-sm font-semibold text-white">Phiên bản gần đây</div>
                    <div className="mt-3 space-y-2">
                      {(selectedPage.revisions || []).map((revision) => (
                        <div key={revision.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/6 px-3 py-2 text-xs text-white/50">
                          <span>v{revision.version} bởi {revision.createdBy?.fullName || "Không rõ"}</span>
                          <span>{formatShortDate(revision.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-center text-sm text-white/42">
                  Chọn một trang tài liệu để xem nội dung.
                </div>
              )}
            </article>

            <aside className="rounded-2xl border border-white/10 bg-black/18 p-5">
              {canManage ? (
                <form onSubmit={submitPage} className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{selectedPage ? "Sửa tài liệu" : "Tạo tài liệu"}</h3>
                      <p className="mt-1 text-sm leading-6 text-white/45">Lưu ghi chú dự án, quyết định và mô tả triển khai.</p>
                    </div>
                    {selectedPage && (
                      <button type="button" onClick={resetPageForm} className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-white/68 hover:bg-white/10">Mới</button>
                    )}
                  </div>
                  <WorkspaceFormField label="Tiêu đề">
                    <input value={pageForm.title} onChange={(event) => setPageForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45" placeholder="Ví dụ: Phạm vi MVP" />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Trang cha">
                    <select value={pageForm.parentId} onChange={(event) => setPageForm((current) => ({ ...current, parentId: event.target.value }))} className="w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/45">
                      <option value="">Không có trang cha</option>
                      {pages.filter((page) => page.id !== selectedPageId).map((page) => (
                        <option key={page.id} value={page.id}>{page.title}</option>
                      ))}
                    </select>
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Nội dung">
                    <textarea value={pageForm.content} onChange={(event) => setPageForm((current) => ({ ...current, content: event.target.value }))} rows={10} className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/30 focus:border-white/45" placeholder="Ghi nội dung tài liệu, quyết định hoặc hướng xử lý..." />
                  </WorkspaceFormField>
                  <button type="submit" disabled={savingPage} className="app-button inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm disabled:opacity-60">
                    <Save className="h-4 w-4" />
                    {savingPage ? "Đang lưu..." : selectedPage ? "Lưu phiên bản mới" : "Tạo tài liệu"}
                  </button>
                  {selectedPage && (
                    <button type="button" onClick={() => archivePage(selectedPage)} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-300/20 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-100 hover:bg-red-500/16">
                      <Trash2 className="h-4 w-4" />
                      Lưu trữ tài liệu
                    </button>
                  )}
                </form>
              ) : (
                <div className="text-sm leading-6 text-white/52">Bạn có thể đọc tài liệu dự án. Chỉ admin workspace mới có quyền tạo hoặc sửa tài liệu.</div>
              )}
            </aside>
          </div>
      </section>
      )}

      {selectedProject && projectStep === "timeline" && (
      <section className="mt-5 rounded-[28px] border border-white/10 bg-white/7 p-5">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Timeline & quản trị</h2>
            <div className="mt-1 text-sm text-white/45">
              {selectedProject ? `Theo dõi các việc đã hoàn thành và vòng đời của ${selectedProject.name}.` : "Chọn dự án để xem timeline và quản trị vòng đời."}
            </div>
          </div>
          {selectedProject && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${projectDueState.className}`}>
              {projectDueState.label}
            </span>
          )}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
            <section className="rounded-2xl border border-white/10 bg-black/18 p-5">
              <div className="text-sm font-semibold text-white">Công việc đã hoàn thành</div>
              <div className="mt-4 space-y-3">
                {completedTimeline.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 border-l-2 border-emerald-300/30 pl-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{item.title}</div>
                      <div className="mt-1 text-xs text-white/42">{projectWorkItemTypeLabels[item.type]} · {item.assignedTo?.fullName || "Chưa rõ người xử lý"}</div>
                    </div>
                    <div className="ml-auto shrink-0 text-xs text-white/38">{formatShortDate(item.completedAt || item.updatedAt)}</div>
                  </div>
                ))}
                {!completedTimeline.length && (
                  <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/42">Chưa có công việc hoàn thành.</div>
                )}
              </div>
            </section>

            {canManageSelectedProject && (
              <section className="rounded-2xl border border-white/10 bg-black/18 p-5">
                <h3 className="text-lg font-semibold text-white">Gia hạn hoặc đóng dự án</h3>
                <form onSubmit={extendSelectedProject} className="mt-4 space-y-3">
                  <WorkspaceFormField label="Gia hạn đến">
                    <input type="date" value={extensionForm.dueDate} onChange={(event) => setExtensionForm((current) => ({ ...current, dueDate: event.target.value }))} className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none focus:border-white/45" />
                  </WorkspaceFormField>
                  <textarea value={extensionForm.reason} onChange={(event) => setExtensionForm((current) => ({ ...current, reason: event.target.value }))} rows={2} className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45" placeholder="Lý do gia hạn" />
                  <button type="submit" disabled={lifecycleSubmitting || !extensionForm.dueDate} className="inline-flex w-full items-center justify-center rounded-full border border-white/14 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white/75 hover:bg-white/12 disabled:opacity-50">Gia hạn dự án</button>
                </form>
                <form onSubmit={closeSelectedProject} className="mt-4 space-y-3 border-t border-white/10 pt-4">
                  <textarea value={closeReason} onChange={(event) => setCloseReason(event.target.value)} rows={2} className="w-full rounded-2xl border border-red-300/18 bg-red-500/8 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-red-200/45" placeholder="Lý do đóng dự án" />
                  <button type="submit" disabled={lifecycleSubmitting || selectedProject.status === "CLOSED"} className="inline-flex w-full items-center justify-center rounded-full bg-red-500/90 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">Đóng dự án</button>
                </form>
              </section>
            )}
          </div>
      </section>
      )}
    </div>
  );
}

function ProjectStepTabs({ activeStep, onChange }) {
  const steps = [
    { code: "board", label: "Board", description: "Story, task, sub-task" },
    { code: "docs", label: "Tài liệu", description: "Ghi chú và quyết định" },
    { code: "timeline", label: "Timeline", description: "Hoàn thành, gia hạn, đóng" },
  ];

  return (
    <div className="mt-4 grid gap-2 md:grid-cols-3">
      {steps.map((step) => (
        <button
          key={step.code}
          type="button"
          onClick={() => onChange(step.code)}
          className={`rounded-2xl border px-4 py-3 text-left transition ${activeStep === step.code ? "border-white/35 bg-white text-black" : "border-white/10 bg-black/18 text-white/70 hover:bg-white/8"}`}
        >
          <span className="block text-sm font-semibold">{step.label}</span>
          <span className={`mt-1 block text-xs ${activeStep === step.code ? "text-black/55" : "text-white/38"}`}>{step.description}</span>
        </button>
      ))}
    </div>
  );
}

function ProjectMetric({ label, value, tone = "default" }) {
  const toneClass = {
    default: "border-white/10 bg-black/18 text-white",
    emerald: "border-emerald-300/18 bg-emerald-500/10 text-emerald-50",
    red: "border-red-300/18 bg-red-500/10 text-red-50",
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneClass[tone] || toneClass.default}`}>
      <div className="text-xs font-semibold uppercase text-current opacity-50">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-current">{value}</div>
    </div>
  );
}

function ProjectTimelinePlan({ project, items, selectedItemId, onSelectItem, onCreateIssue }) {
  const rows = buildProjectTimelineRows(items);
  const bounds = getProjectTimelineBounds(project, items);
  const timelineTicks = getProjectTimelineTicks(bounds.start, bounds.end);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/18">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/6 px-4 py-3">
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-normal text-white/42">
          <span>Scope</span>
          <span className="rounded-full bg-white/8 px-2 py-1 text-white/46">{rows.length} issues</span>
        </div>
        <button type="button" onClick={onCreateIssue} className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/74 hover:bg-white/12">
          <Plus className="h-3.5 w-3.5" />
          Create issue
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1180px]">
          <div className="grid grid-cols-[360px_120px_120px_130px_minmax(360px,1fr)] border-b border-white/10 bg-black/24 text-xs font-semibold uppercase text-white/38">
            <div className="border-r border-white/10 px-4 py-3">Issue</div>
            <div className="border-r border-white/10 px-3 py-3">Start date</div>
            <div className="border-r border-white/10 px-3 py-3">Due date</div>
            <div className="border-r border-white/10 px-3 py-3">Status</div>
            <div className="grid grid-cols-4 px-3 py-3">
              {timelineTicks.map((tick) => (
                <div key={tick.key} className="text-white/38">{tick.label}</div>
              ))}
            </div>
          </div>

          <div className="max-h-[560px] overflow-y-auto">
            {rows.map(({ item, level }) => {
              const selected = selectedItemId === item.id;
              const barStyle = getTimelineBarStyle(item, bounds.start, bounds.end);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className={`grid w-full grid-cols-[360px_120px_120px_130px_minmax(360px,1fr)] border-b border-white/7 text-left transition last:border-b-0 ${selected ? "bg-sky-400/10" : "hover:bg-white/6"}`}
                >
                  <div className="min-w-0 border-r border-white/8 px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${level * 22}px` }}>
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${item.type === "STORY" ? "bg-violet-300" : item.type === "TASK" ? "bg-sky-300" : "bg-emerald-300"}`} />
                      <span className="shrink-0 font-mono text-xs font-semibold text-sky-100/70">{project.code}-{item.id}</span>
                      <span className="truncate text-sm font-semibold text-white/82">{item.title}</span>
                    </div>
                    <div className="mt-1 truncate text-xs text-white/34" style={{ paddingLeft: `${level * 22 + 18}px` }}>
                      {projectWorkItemTypeLabels[item.type]} · {item.assignedTo?.fullName || "Unassigned"}
                    </div>
                  </div>
                  <div className="border-r border-white/8 px-3 py-3 text-xs text-white/54">{item.startDate ? formatShortDate(item.startDate) : "-"}</div>
                  <div className="border-r border-white/8 px-3 py-3 text-xs text-white/54">{item.dueDate ? formatShortDate(item.dueDate) : "-"}</div>
                  <div className="border-r border-white/8 px-3 py-2.5">
                    <span className={`inline-flex rounded px-2 py-1 text-[11px] font-semibold uppercase ${getWorkItemStatusClass(item.status)}`}>
                      {projectWorkItemStatuses.find((status) => status.code === item.status)?.label || item.status}
                    </span>
                  </div>
                  <div className="relative min-h-[44px] bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[length:25%_100%] px-3 py-3">
                    {barStyle && (
                      <span className={`absolute top-1/2 h-3 -translate-y-1/2 rounded-full ${item.status === "DONE" ? "bg-emerald-300/80" : item.status === "BLOCKED" ? "bg-red-300/80" : "bg-sky-300/80"}`} style={barStyle} />
                    )}
                  </div>
                </button>
              );
            })}

            {!rows.length && (
              <div className="px-4 py-10 text-center text-sm text-white/42">Chưa có issue nào trong dự án.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProjectWorkItemCard({ item, projectCode, selected, onSelect, onStatusChange }) {
  const overdue = isWorkItemOverdue(item);
  const loggedMinutes = getWorkItemLoggedMinutes(item);
  const statusMeta = projectWorkItemStatuses.find((status) => status.code === item.status);

  return (
    <article className={`rounded-2xl border p-3 transition ${selected ? "border-sky-200/45 bg-sky-400/10" : "border-white/10 bg-white/6 hover:border-white/18 hover:bg-white/9"}`}>
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-[11px] font-semibold uppercase text-sky-100/75">
            {projectCode}-{item.id}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.priority === "URGENT" ? "bg-red-500/18 text-red-100" : item.priority === "HIGH" ? "bg-amber-500/18 text-amber-100" : "bg-white/8 text-white/45"}`}>
            {projectWorkItemPriorityLabels[item.priority] || item.priority}
          </span>
        </div>
        <h4 className="mt-2 line-clamp-3 text-sm font-semibold leading-5 text-white">{item.title}</h4>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/55">{projectWorkItemTypeLabels[item.type] || item.type}</span>
          <span className="rounded-full bg-white/7 px-2 py-0.5 text-[11px] font-semibold text-white/42">{statusMeta?.label || item.status}</span>
        </div>
        <div className="mt-3 space-y-1.5 text-xs text-white/42">
          <div className="truncate">{item.assignedTo?.fullName || "Unassigned"}</div>
          <div className={overdue ? "font-semibold text-red-100" : ""}>
            {item.dueDate ? `Due ${formatShortDate(item.dueDate)}` : "No due date"}
            {overdue ? " · Overdue" : ""}
          </div>
          <div className="flex items-center gap-1 text-white/38">
            <Clock className="h-3.5 w-3.5" />
            {formatWorkMinutes(loggedMinutes)} logged
          </div>
        </div>
      </button>
      <select
        value={item.status}
        onChange={(event) => onStatusChange(event.target.value)}
        className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
      >
        {projectWorkItemStatuses.map((status) => (
          <option key={status.code} value={status.code}>{status.label}</option>
        ))}
      </select>
    </article>
  );
}

function ProjectWorkItemDetail({
  project,
  item,
  workLogForm,
  onWorkLogChange,
  onSubmitWorkLog,
  savingWorkLog,
  onStatusChange,
  onEdit,
}) {
  if (!item) {
    return (
      <section className="rounded-2xl border border-dashed border-white/12 bg-black/18 p-5">
        <div className="text-sm font-semibold text-white">Issue detail</div>
        <div className="mt-2 text-sm leading-6 text-white/45">Chọn một card trên board để xem chi tiết, đổi trạng thái và ghi logwork.</div>
      </section>
    );
  }

  const loggedMinutes = getWorkItemLoggedMinutes(item);
  const locked = project?.status === "CLOSED" || project?.status === "ARCHIVED";

  return (
    <section className="rounded-2xl border border-white/10 bg-black/18 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-xs font-semibold uppercase text-sky-100/70">{project?.code}-{item.id}</div>
          <h3 className="mt-2 text-base font-semibold leading-6 text-white">{item.title}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onEdit} className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/12">Sửa</button>
          <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/55">{projectWorkItemTypeLabels[item.type] || item.type}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniStat label="Priority" value={projectWorkItemPriorityLabels[item.priority] || item.priority} />
        <MiniStat label="Logged" value={formatWorkMinutes(loggedMinutes)} />
        <MiniStat label="Assignee" value={item.assignedTo?.fullName || "Unassigned"} />
        <MiniStat label="Due date" value={item.dueDate ? formatShortDate(item.dueDate) : "No due date"} />
      </div>

      <WorkspaceFormField label="Status">
        <select
          value={item.status}
          onChange={(event) => onStatusChange(event.target.value)}
          disabled={locked}
          className="w-full rounded-2xl border border-white/12 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-white/45 disabled:opacity-50"
        >
          {projectWorkItemStatuses.map((status) => (
            <option key={status.code} value={status.code}>{status.label}</option>
          ))}
        </select>
      </WorkspaceFormField>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/6 p-3">
        <div className="text-xs font-semibold uppercase text-white/42">Description</div>
        <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/62">{item.description || "Chưa có mô tả."}</div>
      </div>

      <form onSubmit={onSubmitWorkLog} className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/6 p-3">
        <div>
          <div className="text-sm font-semibold text-white">Log work</div>
          <div className="mt-1 text-xs text-white/40">Ghi thời gian đã thực hiện task hoặc sub-task.</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="1"
            max="1440"
            value={workLogForm.minutes}
            onChange={(event) => onWorkLogChange((current) => ({ ...current, minutes: event.target.value }))}
            className="w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45"
            placeholder="Phút"
          />
          <input
            type="date"
            value={workLogForm.workedAt}
            onChange={(event) => onWorkLogChange((current) => ({ ...current, workedAt: event.target.value }))}
            className="w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/45"
          />
        </div>
        <textarea
          value={workLogForm.note}
          onChange={(event) => onWorkLogChange((current) => ({ ...current, note: event.target.value }))}
          rows={2}
          className="w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45"
          placeholder="Đã làm gì, còn vướng gì..."
        />
        <button type="submit" disabled={savingWorkLog || locked || !workLogForm.minutes} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45">
          <Clock className="h-4 w-4" />
          {savingWorkLog ? "Đang ghi..." : "Log work"}
        </button>
      </form>

      <div className="mt-4">
        <div className="text-sm font-semibold text-white">Work log</div>
        <div className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
          {(item.workLogs || []).map((log) => (
            <div key={log.id} className="rounded-xl bg-white/6 px-3 py-2">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-white/72">{log.user?.fullName || "Người dùng"}</span>
                <span className="text-white/38">{formatShortDate(log.workedAt)} · {formatWorkMinutes(log.minutes)}</span>
              </div>
              {log.note && <div className="mt-1 text-xs leading-5 text-white/45">{log.note}</div>}
            </div>
          ))}
          {!item.workLogs?.length && (
            <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm text-white/36">Chưa có logwork.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function WorkspaceActivity({ activities = [], loading = false }) {
  const [keyword, setKeyword] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const actionOptions = useMemo(() => (
    Array.from(new Set(activities.map((activity) => activity.action).filter(Boolean)))
  ), [activities]);
  const filteredActivities = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return activities.filter((activity) => {
      const matchesAction = !actionFilter || activity.action === actionFilter;
      const matchesKeyword = !search
        || activity.title?.toLowerCase().includes(search)
        || activity.description?.toLowerCase().includes(search)
        || activity.actor?.fullName?.toLowerCase().includes(search)
        || activity.targetUser?.fullName?.toLowerCase().includes(search);

      return matchesAction && matchesKeyword;
    });
  }, [actionFilter, activities, keyword]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <section className="rounded-[28px] border border-white/10 bg-white/7 p-5">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Hoạt động workspace</h2>
            <div className="mt-1 text-sm text-white/45">Theo dõi thay đổi thành viên, yêu cầu và cấu hình trong workspace.</div>
          </div>
          <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/56">
            {loading ? "Đang tải" : `${filteredActivities.length}/${activities.length} hoạt động`}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="w-full rounded-full border border-white/12 bg-white/8 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45"
              placeholder="Tìm theo tiêu đề, mô tả hoặc người thực hiện"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            className="rounded-full border border-white/12 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-white/45"
          >
            <option value="">Tất cả loại hoạt động</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>{formatWorkspaceActivityAction(action)}</option>
            ))}
          </select>
        </div>

        <div className="mt-5">
          {filteredActivities.length > 0 ? (
            <div className="relative space-y-3 before:absolute before:bottom-3 before:left-4 before:top-3 before:w-px before:bg-white/10">
              {filteredActivities.map((activity) => (
                <article key={activity.id} className="relative grid grid-cols-[2rem_1fr] gap-3">
                  <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-[#11161d] text-xs font-semibold text-white/70">
                    {formatWorkspaceActivityAction(activity.action).slice(0, 1)}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-normal text-white/38">{formatWorkspaceActivityAction(activity.action)}</div>
                        <h3 className="mt-1 text-sm font-semibold text-white">{activity.title}</h3>
                      </div>
                      <time className="shrink-0 text-xs text-white/35">{formatShortDate(activity.createdAt)}</time>
                    </div>
                    {activity.description && <p className="mt-2 text-sm leading-6 text-white/55">{activity.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/42">
                      {activity.actor?.fullName && <span className="rounded-full bg-white/8 px-3 py-1">Bởi {activity.actor.fullName}</span>}
                      {activity.targetUser?.fullName && <span className="rounded-full bg-white/8 px-3 py-1">Liên quan {activity.targetUser.fullName}</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/12 p-8 text-center text-sm text-white/45">
              {loading ? "Đang tải hoạt động workspace..." : "Chưa có hoạt động phù hợp với bộ lọc hiện tại."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function WorkspaceRequests({ workspace, user, requests = [], loading = false, onReload, onPreviewImage }) {
  const [keyword, setKeyword] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [slaFilter, setSlaFilter] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [types, setTypes] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailComments, setDetailComments] = useState([]);
  const [detailHistories, setDetailHistories] = useState([]);
  const [detailComment, setDetailComment] = useState("");
  const [detailStatusForm, setDetailStatusForm] = useState({ statusCode: "", note: "" });
  const [detailAssignForm, setDetailAssignForm] = useState({ assignedToId: "", note: "" });
  const [addingDetailComment, setAddingDetailComment] = useState(false);
  const [updatingDetailStatus, setUpdatingDetailStatus] = useState(false);
  const [assigningDetailRequest, setAssigningDetailRequest] = useState(false);
  const [selfAssigning, setSelfAssigning] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    projectId: "",
    requestTypeId: "",
    priorityId: "",
    dueDate: getTodayInputDate(),
    visibility: "PUBLIC",
    privateMemberIds: [],
    attachments: [],
  });
  const now = new Date();
  const workspaceScopedRequests = requests;
  const stats = {
    total: workspaceScopedRequests.length,
    active: workspaceScopedRequests.filter((request) => !["HOAN_THANH", "TU_CHOI"].includes(request.status?.code)).length,
    overdue: workspaceScopedRequests.filter((request) => request.dueDate && new Date(request.dueDate) < now && request.status?.code !== "HOAN_THANH").length,
    completed: workspaceScopedRequests.filter((request) => request.status?.code === "HOAN_THANH").length,
  };
  const statusOptions = Array.from(
    new Map(workspaceScopedRequests.map((request) => [request.status?.code, request.status]).filter(([code]) => Boolean(code))).values(),
  );
  const creatorOptions = Array.from(
    new Map(workspaceScopedRequests.map((request) => [request.createdBy?.id, request.createdBy]).filter(([id]) => Boolean(id))).values(),
  );
  const assigneeOptions = Array.from(
    new Map(workspaceScopedRequests.map((request) => [request.assignedTo?.id, request.assignedTo]).filter(([id]) => Boolean(id))).values(),
  );
  const projectOptions = projects;
  const activeProjects = projects.filter((project) => project.status === "ACTIVE");
  const filteredRequests = workspaceScopedRequests.filter((request) => {
    const search = keyword.trim().toLowerCase();
    const slaState = getRequestSlaState(request);
    const matchesKeyword = !search
      || request.requestCode?.toLowerCase().includes(search)
      || request.title?.toLowerCase().includes(search)
      || request.description?.toLowerCase().includes(search)
      || request.project?.name?.toLowerCase().includes(search)
      || request.project?.code?.toLowerCase().includes(search);
    const matchesProject = !projectFilter || String(request.project?.id) === projectFilter;
    const matchesStatus = !statusFilter || request.status?.code === statusFilter;
    const matchesType = !typeFilter || request.requestType?.code === typeFilter;
    const matchesPriority = !priorityFilter || request.priority?.code === priorityFilter;
    const matchesCreator = !creatorFilter || String(request.createdBy?.id) === creatorFilter;
    const matchesAssignee = !assigneeFilter || String(request.assignedTo?.id) === assigneeFilter;
    const matchesSla = !slaFilter || slaState.code === slaFilter;
    const isOverdue = request.dueDate && new Date(request.dueDate) < now && request.status?.code !== "HOAN_THANH";
    const matchesQuick = quickFilter === "all"
      || (quickFilter === "active" && !["HOAN_THANH", "TU_CHOI"].includes(request.status?.code))
      || (quickFilter === "overdue" && isOverdue)
      || (quickFilter === "completed" && request.status?.code === "HOAN_THANH");

    return matchesKeyword && matchesProject && matchesStatus && matchesType && matchesPriority && matchesCreator && matchesAssignee && matchesSla && matchesQuick;
  });

  useEffect(() => {
    Promise.all([
      api.get(`/request-types?workspaceId=${workspace.id}`),
      api.get("/catalog/priorities"),
      api.get(`/projects?workspaceId=${workspace.id}`),
    ]).then(([typesResponse, prioritiesResponse, projectsResponse]) => {
      setTypes(typesResponse.data.data || []);
      setPriorities(prioritiesResponse.data.data || []);
      setProjects(projectsResponse.data.data || []);
    }).catch((err) => {
      setCreateError(getErrorMessage(err));
    });
  }, [workspace.id]);

  function openCreateRequest() {
    setCreateError("");
    setCreateForm({
      title: "",
      description: "",
      projectId: activeProjects[0]?.id ? String(activeProjects[0].id) : "",
      requestTypeId: "",
      priorityId: "",
      dueDate: getDateInputAfterHours(workspace.defaultSlaHours) || getTodayInputDate(),
      visibility: "PUBLIC",
      privateMemberIds: [],
      attachments: [],
    });
    setCreateOpen(true);
  }

  function updateCreateField(field, value) {
    const selectedType = field === "requestTypeId"
      ? types.find((type) => String(type.id) === String(value))
      : null;

    setCreateForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "requestTypeId" && selectedType?.defaultPriorityId ? { priorityId: String(selectedType.defaultPriorityId) } : {}),
      ...(field === "visibility" && value === "PUBLIC" ? { privateMemberIds: [] } : {}),
    }));
  }

  async function submitWorkspaceRequest(event) {
    event.preventDefault();
    setCreateError("");

    if (!createForm.projectId) {
      setCreateError("Cần chọn dự án trước khi tạo yêu cầu.");
      return;
    }

    setCreating(true);

    try {
      await api.post("/requests", {
        ...createForm,
        workspaceId: workspace.id,
        privateMemberIds: createForm.visibility === "PRIVATE" ? createForm.privateMemberIds : [],
      });
      setCreateOpen(false);
      await onReload?.();
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function openRequestDetail(request) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError("");
    setSelectedRequest(request);
    setDetailComments([]);
    setDetailHistories([]);
    setDetailComment("");
    setDetailStatusForm({ statusCode: "", note: "" });
    setDetailAssignForm({ assignedToId: request.assignedToId ? String(request.assignedToId) : "", note: "" });

    try {
      const [requestResponse, commentsResponse, historiesResponse] = await Promise.all([
        api.get(`/requests/${request.id}`),
        api.get(`/requests/${request.id}/comments`),
        api.get(`/requests/${request.id}/histories`),
      ]);
      setSelectedRequest(requestResponse.data.data);
      setDetailAssignForm({
        assignedToId: requestResponse.data.data?.assignedToId ? String(requestResponse.data.data.assignedToId) : "",
        note: "",
      });
      setDetailComments(commentsResponse.data.data || []);
      setDetailHistories(historiesResponse.data.data || []);
    } catch (err) {
      setDetailError(getErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  }

  async function submitDetailComment(event) {
    event.preventDefault();

    if (!selectedRequest || !detailComment.trim()) {
      return;
    }

    setAddingDetailComment(true);
    setDetailError("");

    try {
      const response = await api.post(`/requests/${selectedRequest.id}/comments`, { content: detailComment.trim() });
      setDetailComments((current) => [...current, response.data.data]);
      setDetailComment("");
      await onReload?.();
    } catch (err) {
      setDetailError(getErrorMessage(err));
    } finally {
      setAddingDetailComment(false);
    }
  }

  async function submitDetailStatus(event) {
    event.preventDefault();

    if (!selectedRequest || !detailStatusForm.statusCode) {
      return;
    }

    setUpdatingDetailStatus(true);
    setDetailError("");

    try {
      await api.post(`/requests/${selectedRequest.id}/status`, detailStatusForm);
      const [requestResponse, historiesResponse] = await Promise.all([
        api.get(`/requests/${selectedRequest.id}`),
        api.get(`/requests/${selectedRequest.id}/histories`),
      ]);
      setSelectedRequest(requestResponse.data.data);
      setDetailHistories(historiesResponse.data.data || []);
      setDetailStatusForm({ statusCode: "", note: "" });
      await onReload?.();
    } catch (err) {
      setDetailError(getErrorMessage(err));
    } finally {
      setUpdatingDetailStatus(false);
    }
  }

  async function selfAssignRequest() {
    if (!selectedRequest) {
      return;
    }

    setSelfAssigning(true);
    setDetailError("");

    try {
      const response = await api.post(`/requests/${selectedRequest.id}/self-assign`);
      const historiesResponse = await api.get(`/requests/${selectedRequest.id}/histories`);
      setSelectedRequest(response.data.data);
      setDetailAssignForm({
        assignedToId: response.data.data?.assignedToId ? String(response.data.data.assignedToId) : "",
        note: "",
      });
      setDetailHistories(historiesResponse.data.data || []);
      setDetailStatusForm({ statusCode: "DANG_XU_LY", note: "" });
      await onReload?.();
    } catch (err) {
      setDetailError(getErrorMessage(err));
    } finally {
      setSelfAssigning(false);
    }
  }

  async function submitDetailAssign(event) {
    event.preventDefault();

    if (!selectedRequest || !detailAssignForm.assignedToId) {
      return;
    }

    setAssigningDetailRequest(true);
    setDetailError("");

    try {
      const response = await api.post(`/requests/${selectedRequest.id}/assign`, {
        assignedToId: Number(detailAssignForm.assignedToId),
        note: detailAssignForm.note,
      });
      const historiesResponse = await api.get(`/requests/${selectedRequest.id}/histories`);
      setSelectedRequest(response.data.data);
      setDetailAssignForm({
        assignedToId: response.data.data?.assignedToId ? String(response.data.data.assignedToId) : "",
        note: "",
      });
      setDetailHistories(historiesResponse.data.data || []);
      setDetailStatusForm({ statusCode: "DANG_XU_LY", note: "" });
      await onReload?.();
    } catch (err) {
      setDetailError(getErrorMessage(err));
    } finally {
      setAssigningDetailRequest(false);
    }
  }

  function togglePrivateMember(userId) {
    setCreateForm((current) => {
      const existed = current.privateMemberIds.includes(userId);
      return {
        ...current,
        privateMemberIds: existed
          ? current.privateMemberIds.filter((id) => id !== userId)
          : [...current.privateMemberIds, userId],
      };
    });
  }

  function handleRequestAttachments(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    files.slice(0, 6).forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        setCreateError("Mỗi file đính kèm tối đa 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setCreateForm((current) => ({
          ...current,
          attachments: [
            ...current.attachments,
            {
              type: file.type.startsWith("image/") ? "IMAGE" : "FILE",
              name: file.name,
              mime: file.type || "application/octet-stream",
              data: String(reader.result || ""),
            },
          ].slice(0, 6),
        }));
      };
      reader.readAsDataURL(file);
    });
  }

  function removeRequestAttachment(index) {
    setCreateForm((current) => ({
      ...current,
      attachments: current.attachments.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="rounded-[28px] border border-white/10 bg-white/7 p-5">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Yêu cầu</h2>
            <div className="mt-1 text-sm text-white/45">Theo dõi, lọc và mở nhanh các yêu cầu liên quan đến workspace.</div>
          </div>
          <button type="button" onClick={openCreateRequest} className="app-button inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm">
            <Plus className="h-4 w-4" />
            Tạo yêu cầu
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Tổng" value={stats.total} />
          <MiniStat label="Đang mở" value={stats.active} />
          <MiniStat label="Quá hạn" value={stats.overdue} />
          <MiniStat label="Hoàn thành" value={stats.completed} />
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/18 p-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "Tất cả"],
              ["active", "Đang mở"],
              ["overdue", "Quá hạn"],
              ["completed", "Hoàn thành"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setQuickFilter(value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${quickFilter === value ? "bg-white text-black" : "bg-white/8 text-white/62 hover:bg-white/12"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                className="w-full rounded-full border border-white/12 bg-white/8 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45"
                placeholder="Tìm mã, tiêu đề, nội dung"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-full border border-white/12 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-white/45"
            >
              <option value="">Tất cả trạng thái</option>
              {statusOptions.map((status) => (
                <option key={status.code} value={status.code}>{status.name}</option>
              ))}
            </select>
            <select
              value={slaFilter}
              onChange={(event) => setSlaFilter(event.target.value)}
              className="rounded-full border border-white/12 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-white/45"
            >
              <option value="">Tất cả SLA</option>
              <option value="ON_TIME">Đúng hạn</option>
              <option value="DUE_SOON">Còn dưới 24h</option>
              <option value="OVERDUE">Quá hạn</option>
              <option value="NO_DUE">Chưa có hạn</option>
            </select>
          </div>
        </div>

        <div className="mt-3 grid gap-2 rounded-2xl border border-white/10 bg-black/12 p-3 sm:grid-cols-2 xl:grid-cols-5">
          <select
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
            className="rounded-full border border-white/12 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-white/45"
          >
            <option value="">Tất cả dự án</option>
            {projectOptions.map((project) => <option key={project.id} value={project.id}>{project.code} - {project.name}</option>)}
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-full border border-white/12 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-white/45"
          >
            <option value="">Tất cả loại yêu cầu</option>
            {types.map((type) => <option key={type.code} value={type.code}>{type.name}</option>)}
          </select>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            className="rounded-full border border-white/12 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-white/45"
          >
            <option value="">Tất cả ưu tiên</option>
            {priorities.map((priority) => <option key={priority.code} value={priority.code}>{priority.name}</option>)}
          </select>
          <select
            value={creatorFilter}
            onChange={(event) => setCreatorFilter(event.target.value)}
            className="rounded-full border border-white/12 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-white/45"
          >
            <option value="">Tất cả người tạo</option>
            {creatorOptions.map((creator) => <option key={creator.id} value={creator.id}>{creator.fullName}</option>)}
          </select>
          <select
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
            className="rounded-full border border-white/12 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-white/45"
          >
            <option value="">Tất cả người xử lý</option>
            {assigneeOptions.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.fullName}</option>)}
          </select>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
          <div className="hidden grid-cols-[112px_minmax(180px,1fr)_128px_112px_104px_112px_104px_64px] gap-3 border-b border-white/10 bg-white/6 px-4 py-3 text-xs font-semibold uppercase tracking-normal text-white/38 lg:grid xl:grid-cols-[130px_minmax(220px,1fr)_150px_140px_120px_130px_120px_80px] xl:gap-4">
            <div>Mã</div>
            <div>Tiêu đề</div>
            <div>Dự án</div>
            <div>Loại</div>
            <div>Ưu tiên</div>
            <div>Trạng thái</div>
            <div>SLA</div>
            <div className="text-right">Mở</div>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {filteredRequests.map((request) => {
              const isOverdue = request.dueDate && new Date(request.dueDate) < now && request.status?.code !== "HOAN_THANH";
              const slaState = getRequestSlaState(request);

              return (
                <article key={request.id} className="border-b border-white/8 last:border-b-0">
                  {/* Mobile (<lg): card có thể click toàn bộ */}
                  <button
                    type="button"
                    onClick={() => openRequestDetail(request)}
                    className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-white/5 lg:hidden"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-white/45">{request.requestCode}</div>
                        <div className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-white">{request.title}</div>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-white/40" />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <RequestPill tone={isOverdue ? "QUA_HAN" : request.status?.code}>{isOverdue ? "Quá hạn" : request.status?.name || "Chưa rõ"}</RequestPill>
                      <RequestPill tone={request.priority?.code}>{request.priority?.name || "Chưa rõ"}</RequestPill>
                      <RequestPill tone={slaState.code}>{slaState.label}</RequestPill>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Loại</div>
                        <div className="mt-0.5 truncate text-white/72">{request.requestType?.name || "—"}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Dự án</div>
                        <div className="mt-0.5 truncate text-white/72">{request.project?.code || "—"}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Người xử lý</div>
                        <div className="mt-0.5 truncate text-white/72">{request.assignedTo?.fullName || "Chưa phân công"}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Hạn xử lý</div>
                        <div className="mt-0.5 truncate text-white/72">{request.dueDate ? formatShortDate(request.dueDate) : "Chưa có hạn"}</div>
                      </div>
                    </div>
                  </button>

                  {/* Desktop (lg+): grid layout */}
                  <div className="hidden items-center gap-3 px-4 py-3 hover:bg-white/5 lg:grid lg:grid-cols-[112px_minmax(180px,1fr)_128px_112px_104px_112px_104px_64px] xl:grid-cols-[130px_minmax(220px,1fr)_150px_140px_120px_130px_120px_80px] xl:gap-4">
                    <div className="truncate font-mono text-xs font-semibold text-white/72">{request.requestCode}</div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold leading-5 text-white">{request.title}</div>
                      <div className="mt-1 truncate text-xs leading-5 text-white/38">
                        {request.assignedTo?.fullName ? `Xử lý: ${request.assignedTo.fullName}` : "Chưa phân công"}
                        {request.dueDate ? ` · Hạn: ${formatShortDate(request.dueDate)}` : ""}
                      </div>
                    </div>
                    <div className="truncate text-sm text-white/58">{request.project ? `${request.project.code} - ${request.project.name}` : "Chưa gắn dự án"}</div>
                    <div className="truncate text-sm text-white/58">{request.requestType?.name || "Chưa rõ"}</div>
                    <RequestPill tone={request.priority?.code}>{request.priority?.name || "Chưa rõ"}</RequestPill>
                    <RequestPill tone={isOverdue ? "QUA_HAN" : request.status?.code}>{isOverdue ? "Quá hạn" : request.status?.name || "Chưa rõ"}</RequestPill>
                    <RequestPill tone={slaState.code}>{slaState.label}</RequestPill>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => openRequestDetail(request)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 text-white/72 hover:bg-white/10 hover:text-white" title="Mở chi tiết yêu cầu">
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {!filteredRequests.length && (
              <div className="p-6 text-sm text-white/45">
                {loading ? "Đang tải yêu cầu..." : "Chưa có yêu cầu phù hợp với bộ lọc hiện tại."}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 text-xs text-white/35">
          Dữ liệu đang được lọc trực tiếp theo workspace và phạm vi public/private của từng yêu cầu.
        </div>
      </div>

      {createOpen && (
        <Modal title="Tạo yêu cầu trong workspace" onClose={() => setCreateOpen(false)}>
          <form onSubmit={submitWorkspaceRequest} className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/7 px-4 py-3">
              <div className="text-xs font-semibold uppercase text-white/38">Workspace</div>
              <div className="mt-1 text-sm font-semibold text-white">{workspace.name}</div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-white/42">Dự án</label>
              <select
                value={createForm.projectId}
                onChange={(event) => updateCreateField("projectId", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/12 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-white/45"
                required
              >
                <option value="">Chọn dự án để tạo yêu cầu</option>
                {activeProjects.map((project) => <option key={project.id} value={project.id}>{project.code} - {project.name}</option>)}
              </select>
              {!activeProjects.length && (
                <div className="mt-2 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-50/75">
                  Workspace chưa có dự án active. Hãy tạo hoặc mở lại dự án trước khi tạo yêu cầu.
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-white/42">Tiêu đề</label>
              <input
                value={createForm.title}
                onChange={(event) => updateCreateField("title", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45"
                placeholder="Nhập tiêu đề yêu cầu"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-white/42">Nội dung</label>
              <textarea
                value={createForm.description}
                onChange={(event) => updateCreateField("description", event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45"
                placeholder="Mô tả vấn đề, mong muốn xử lý và kết quả cần nhận"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-white/42">Loại yêu cầu</label>
                <select
                  value={createForm.requestTypeId}
                  onChange={(event) => updateCreateField("requestTypeId", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-white/45"
                >
                  <option value="">Chọn loại</option>
                  {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-white/42">Mức ưu tiên</label>
                <select
                  value={createForm.priorityId}
                  onChange={(event) => updateCreateField("priorityId", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-white/45"
                >
                  <option value="">Chọn mức</option>
                  {priorities.map((priority) => <option key={priority.id} value={priority.id}>{priority.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-white/42">Hạn xử lý</label>
                <input
                  type="date"
                  value={createForm.dueDate}
                  onChange={(event) => updateCreateField("dueDate", event.target.value)}
                  disabled={workspace.allowRequesterDueDateOverride === false}
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-white/45 disabled:cursor-not-allowed disabled:opacity-60"
                />
                {workspace.defaultSlaHours ? (
                  <div className="mt-2 text-xs text-white/38">SLA workspace: {formatSlaHours(workspace.defaultSlaHours)}</div>
                ) : null}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-white/42">Phạm vi</label>
                <select
                  value={createForm.visibility}
                  onChange={(event) => updateCreateField("visibility", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-white/45"
                >
                  <option value="PUBLIC">Public trong workspace</option>
                  <option value="PRIVATE">Riêng tư</option>
                </select>
              </div>
            </div>

            {createForm.visibility === "PRIVATE" && (
              <div className="rounded-2xl border border-violet-300/16 bg-violet-400/10 p-4">
                <div className="text-xs font-semibold uppercase text-violet-100/70">Thành viên được xem yêu cầu riêng tư</div>
                <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
                  {(workspace.members || []).filter((member) => member.status === "ACTIVE").map((member) => (
                    <label key={member.userId} className="flex min-h-14 items-center gap-3 rounded-xl bg-black/18 px-3 py-2 text-sm text-white/72">
                      <input
                        type="checkbox"
                        className="shrink-0"
                        checked={createForm.privateMemberIds.includes(member.userId)}
                        onChange={() => togglePrivateMember(member.userId)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-white">{member.user?.fullName || "Thành viên"}</span>
                        <span className="block truncate text-xs text-white/38">@{member.user?.username || member.user?.email}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-2 text-xs text-violet-50/55">Người tạo, admin workspace và người được chọn sẽ xem được yêu cầu này.</div>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/7 p-4">
              <label className="text-xs font-semibold uppercase text-white/42">File và ảnh đính kèm</label>
              <input
                type="file"
                multiple
                onChange={handleRequestAttachments}
                className="mt-3 w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-black"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              />
              {createForm.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {createForm.attachments.map((attachment, index) => (
                    <button
                      key={`${attachment.name}-${index}`}
                      type="button"
                      onClick={() => removeRequestAttachment(index)}
                      className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs text-white/70 hover:bg-white/12"
                      title="Bấm để bỏ file"
                    >
                      {attachment.type === "IMAGE" ? "Ảnh" : "File"}: {attachment.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {createError && <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">{createError}</div>}

            <FormActions submitting={creating} submitLabel="Tạo yêu cầu" onCancel={() => setCreateOpen(false)} />
          </form>
        </Modal>
      )}

      {detailOpen && (
        <WorkspaceRequestDetailModal
          user={user}
          request={selectedRequest}
          comments={detailComments}
          histories={detailHistories}
          loading={detailLoading}
          error={detailError}
          comment={detailComment}
          statusForm={detailStatusForm}
          assignForm={detailAssignForm}
          addingComment={addingDetailComment}
          updatingStatus={updatingDetailStatus}
          assigning={assigningDetailRequest}
          selfAssigning={selfAssigning}
          workspaceMembers={workspace.members || []}
          onCommentChange={setDetailComment}
          onStatusFormChange={setDetailStatusForm}
          onAssignFormChange={setDetailAssignForm}
          onSubmitComment={submitDetailComment}
          onSubmitStatus={submitDetailStatus}
          onSubmitAssign={submitDetailAssign}
          onSelfAssign={selfAssignRequest}
          onPreviewImage={onPreviewImage}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </div>
  );
}

function RequestPill({ tone, children }) {
  const classByTone = {
    THAP: "bg-white/10 text-white/65",
    TRUNG_BINH: "bg-blue-400/14 text-blue-100",
    CAO: "bg-amber-400/16 text-amber-100",
    KHAN_CAP: "bg-red-400/16 text-red-100",
    CHO_TIEP_NHAN: "bg-white/10 text-white/65",
    DA_PHAN_CONG: "bg-blue-400/14 text-blue-100",
    DANG_XU_LY: "bg-amber-400/16 text-amber-100",
    CAN_BO_SUNG: "bg-violet-400/16 text-violet-100",
    HOAN_THANH: "bg-emerald-400/16 text-emerald-100",
    TU_CHOI: "bg-red-400/16 text-red-100",
    QUA_HAN: "bg-orange-400/16 text-orange-100",
    OVERDUE: "bg-red-400/16 text-red-100",
    DUE_SOON: "bg-amber-400/16 text-amber-100",
    ON_TIME: "bg-emerald-400/16 text-emerald-100",
    NO_DUE: "bg-white/10 text-white/65",
    PUBLIC: "bg-sky-400/16 text-sky-100",
    PRIVATE: "bg-violet-400/16 text-violet-100",
  };

  return (
    <span className={`inline-flex w-fit max-w-full rounded-full px-3 py-1 text-xs font-semibold ${classByTone[tone] || "bg-white/10 text-white/65"}`}>
      <span className="truncate">{children}</span>
    </span>
  );
}

function WorkspaceRequestDetailModal({
  user,
  request,
  comments,
  histories,
  loading,
  error,
  comment,
  statusForm,
  assignForm,
  addingComment,
  updatingStatus,
  assigning,
  selfAssigning,
  workspaceMembers,
  onCommentChange,
  onStatusFormChange,
  onAssignFormChange,
  onSubmitComment,
  onSubmitStatus,
  onSubmitAssign,
  onSelfAssign,
  onPreviewImage,
  onClose,
}) {
  const visibilityLabel = request?.visibility === "PRIVATE" ? "Riêng tư" : "Public";
  const slaState = getRequestSlaState(request);
  const canSelfAssign = Boolean(
    request?.id
      && request.visibility === "PUBLIC"
      && !request.assignedToId
      && request.status?.code !== "HOAN_THANH"
      && request.status?.code !== "TU_CHOI"
      && request.createdById !== user?.id,
  );
  const canAssign = user?.role?.code === "ADMIN" || workspaceMembers?.some((member) => member.userId === user?.id && member.status === "ACTIVE" && member.role === "ADMIN");
  const assignableMembers = (workspaceMembers || []).filter((member) => member.status === "ACTIVE");
  const sourceLabel = request?.workspace?.name
    ? `Tạo trong workspace "${request.workspace.name}". Thành viên được quyền sẽ theo dõi cùng mã yêu cầu này.`
    : "Tạo từ request desk chung. Có thể gắn vào workspace khi cần quản lý theo nhóm.";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/72 px-4 py-6 backdrop-blur-md">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/12 bg-[#17151c] shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-white/52">{request?.requestCode || "Đang tải"}</span>
              {request?.visibility && <RequestPill tone={request.visibility}>{visibilityLabel}</RequestPill>}
              {request?.status && <RequestPill tone={request.status.code}>{request.status.name}</RequestPill>}
              {request?.priority && <RequestPill tone={request.priority.code}>{request.priority.name}</RequestPill>}
            </div>
            <h3 className="mt-2 truncate text-2xl font-semibold text-white">{request?.title || "Chi tiết yêu cầu"}</h3>
            <div className="mt-1 text-sm text-white/42">{request?.workspace?.name || "Workspace hiện tại"}</div>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/72 hover:bg-white/15 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/7 p-5 text-sm text-white/52">Đang tải chi tiết yêu cầu...</div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-5">
                {error && <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</div>}

                <div className="grid gap-3 md:grid-cols-3">
                  <RequestKpiCard label="Trạng thái SLA" value={slaState.detail} tone={slaState.code} />
                  <RequestKpiCard label="Mức ưu tiên" value={request?.priority?.name || "Chưa rõ"} tone={request?.priority?.code} />
                  <RequestKpiCard label="Đơn vị phụ trách" value={request?.assignedDepartment?.name || "Chưa phân công"} tone="NO_DUE" />
                </div>

                {slaState.note && (
                  <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${slaState.code === "OVERDUE" ? "border-red-300/25 bg-red-500/14 text-red-50/80" : "border-amber-300/25 bg-amber-500/12 text-amber-50/80"}`}>
                    <strong>{slaState.code === "OVERDUE" ? "Cảnh báo SLA:" : "Nhắc hạn xử lý:"}</strong> {slaState.note}
                  </div>
                )}

                <div className="rounded-2xl border border-sky-300/18 bg-sky-400/10 px-4 py-3 text-sm leading-6 text-sky-50/75">
                  <strong className="text-sky-50">Nguồn yêu cầu:</strong> {sourceLabel}
                </div>

                <section className="rounded-2xl border border-white/10 bg-white/7 p-5">
                  <div className="text-sm font-semibold text-white">Nội dung yêu cầu</div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/62">{request?.description || "Chưa có nội dung."}</p>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <InfoBox label="Dự án" value={request?.project ? `${request.project.code} - ${request.project.name}` : "Chưa gắn dự án"} />
                    <InfoBox label="Loại yêu cầu" value={request?.requestType?.name || "Chưa rõ"} />
                    <InfoBox label="Người tạo" value={request?.createdBy?.fullName || "Chưa rõ"} />
                    <InfoBox label="Người xử lý" value={request?.assignedTo?.fullName || "Chưa phân công"} />
                    <InfoBox label="Hạn xử lý" value={request?.dueDate ? formatShortDate(request.dueDate) : "Chưa đặt"} />
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/7 p-5">
                  <div className="text-sm font-semibold text-white">File và ảnh đính kèm</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {request?.attachments?.length ? (
                      request.attachments.map((attachment) => (
                        <RequestAttachmentItem key={attachment.id} attachment={attachment} onPreviewImage={onPreviewImage} />
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/42">Yêu cầu này chưa có file hoặc ảnh đính kèm.</div>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/7 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">Ghi chú xử lý</div>
                      <div className="mt-1 text-xs text-white/40">Trao đổi nhanh trong phạm vi yêu cầu.</div>
                    </div>
                  </div>

                  <form onSubmit={onSubmitComment} className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input
                      value={comment}
                      onChange={(event) => onCommentChange(event.target.value)}
                      className="min-w-0 flex-1 rounded-full border border-white/12 bg-black/24 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45"
                      placeholder="Nhập ghi chú"
                    />
                    <button type="submit" disabled={addingComment || !comment.trim()} className="app-button inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:opacity-50">
                      <Send className="h-4 w-4" />
                      {addingComment ? "Đang gửi..." : "Gửi"}
                    </button>
                  </form>

                  <div className="mt-4 space-y-3">
                    {comments.length > 0 ? (
                      comments.map((item) => (
                        <div key={item.id} className="rounded-2xl bg-black/20 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-white">{item.user?.fullName || "Người dùng"}</div>
                            <div className="text-xs text-white/35">{formatShortDate(item.createdAt)}</div>
                          </div>
                          <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/62">{item.content}</div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/42">Chưa có ghi chú.</div>
                    )}
                  </div>
                </section>
              </div>

              <aside className="space-y-5">
                <section className="rounded-2xl border border-white/10 bg-white/7 p-5">
                  <div className="text-sm font-semibold text-white">Khu vực người xử lý</div>
                  <div className="mt-1 text-xs text-white/40">Cập nhật tiến độ hoặc ghi kết quả xử lý để người tạo yêu cầu theo dõi.</div>
                  {canAssign && (
                    <form onSubmit={onSubmitAssign} className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-black/18 p-3">
                      <div className="text-xs font-semibold uppercase tracking-normal text-white/42">Phân công xử lý</div>
                      <select
                        value={assignForm.assignedToId}
                        onChange={(event) => onAssignFormChange((current) => ({ ...current, assignedToId: event.target.value }))}
                        className="w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/45"
                      >
                        <option value="">Chọn người xử lý</option>
                        {assignableMembers.map((member) => (
                          <option key={member.id} value={member.userId}>
                            {member.user?.fullName || member.user?.username || member.user?.email}
                          </option>
                        ))}
                      </select>
                      <textarea
                        value={assignForm.note}
                        onChange={(event) => onAssignFormChange((current) => ({ ...current, note: event.target.value }))}
                        rows={3}
                        className="w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45"
                        placeholder="Ghi chú phân công"
                      />
                      <button type="submit" disabled={assigning || !assignForm.assignedToId} className="app-button inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:opacity-50">
                        <UserPlus className="h-4 w-4" />
                        {assigning ? "Đang phân công..." : "Phân công yêu cầu"}
                      </button>
                    </form>
                  )}
                  {canSelfAssign && (
                    <button
                      type="button"
                      onClick={onSelfAssign}
                      disabled={selfAssigning}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      {selfAssigning ? "Đang nhận xử lý..." : "Nhận xử lý yêu cầu này"}
                    </button>
                  )}
                  <form onSubmit={onSubmitStatus} className="mt-4 space-y-3">
                    <select
                      value={statusForm.statusCode}
                      onChange={(event) => onStatusFormChange((current) => ({ ...current, statusCode: event.target.value }))}
                      className="w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/45"
                    >
                      <option value="">Chọn trạng thái xử lý</option>
                      {requestStatusOptions.map((status) => <option key={status.code} value={status.code}>{status.name}</option>)}
                    </select>
                    <textarea
                      value={statusForm.note}
                      onChange={(event) => onStatusFormChange((current) => ({ ...current, note: event.target.value }))}
                      rows={4}
                      className="w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/45"
                      placeholder="Ghi kết quả xử lý, lý do tạm dừng hoặc thông tin cần bổ sung"
                    />
                    <button type="submit" disabled={updatingStatus || !statusForm.statusCode} className="app-button inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:opacity-50">
                      <Save className="h-4 w-4" />
                      {updatingStatus ? "Đang cập nhật..." : "Cập nhật xử lý"}
                    </button>
                  </form>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/7 p-5">
                  <div className="text-sm font-semibold text-white">Thông tin xử lý</div>
                  <div className="mt-4 space-y-3">
                    <DetailLine label="Bộ phận xử lý" value={request?.assignedDepartment?.name || "Chưa phân công"} />
                    <DetailLine label="Trạng thái" value={request?.status?.name || "Chưa rõ"} />
                    <DetailLine label="Ưu tiên" value={request?.priority?.name || "Chưa rõ"} />
                    <DetailLine label="Phạm vi" value={visibilityLabel} />
                    <DetailLine label="Ngày tạo" value={request?.createdAt ? formatShortDate(request.createdAt) : "Chưa rõ"} />
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/7 p-5">
                  <div className="text-sm font-semibold text-white">Lịch sử thay đổi</div>
                  <RequestStatusFlow request={request} />
                  <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                    {histories.length > 0 ? (
                      histories.map((history) => (
                        <div key={history.id} className="border-l-2 border-white/16 pl-3">
                          <div className="text-sm font-semibold text-white/82">{formatRequestHistoryAction(history.action)}</div>
                          <div className="mt-1 text-xs text-white/35">
                            {history.actor?.fullName || "Hệ thống"} · {formatShortDate(history.createdAt)}
                          </div>
                          {history.note && <div className="mt-1 text-sm leading-5 text-white/55">{history.note}</div>}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/42">Chưa có lịch sử.</div>
                    )}
                  </div>
                </section>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestKpiCard({ label, value, tone }) {
  const toneClass = {
    OVERDUE: "border-red-300/20 bg-red-500/12 text-red-50",
    DUE_SOON: "border-amber-300/20 bg-amber-500/12 text-amber-50",
    ON_TIME: "border-emerald-300/20 bg-emerald-500/12 text-emerald-50",
    CAO: "border-amber-300/20 bg-amber-500/12 text-amber-50",
    KHAN_CAP: "border-red-300/20 bg-red-500/12 text-red-50",
    NO_DUE: "border-white/10 bg-white/7 text-white",
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneClass[tone] || "border-white/10 bg-white/7 text-white"}`}>
      <div className="text-xs font-semibold uppercase text-current opacity-55">{label}</div>
      <div className="mt-2 text-lg font-semibold text-current">{value}</div>
    </div>
  );
}

function RequestStatusFlow({ request }) {
  const statusCode = request?.status?.code;
  const steps = [
    { code: "CHO_TIEP_NHAN", label: "Tiếp nhận", description: "Yêu cầu được ghi nhận vào hệ thống." },
    { code: "DA_PHAN_CONG", label: "Phân công", description: "Chọn người hoặc bộ phận phụ trách." },
    { code: "DANG_XU_LY", label: "Xử lý", description: "Người phụ trách đang xử lý nội dung." },
    { code: "HOAN_THANH", label: "Hoàn tất", description: "Đóng yêu cầu hoặc từ chối nếu không phù hợp." },
  ];
  const currentIndex = statusCode === "TU_CHOI"
    ? steps.length - 1
    : Math.max(0, steps.findIndex((step) => step.code === statusCode));

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <div key={step.code} className={`rounded-2xl border px-3 py-3 ${active ? "border-white/30 bg-white/12" : done ? "border-emerald-300/18 bg-emerald-400/10" : "border-white/10 bg-black/16"}`}>
            <div className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-emerald-300 text-black" : active ? "bg-white text-black" : "bg-white/10 text-white/55"}`}>
                {index + 1}
              </span>
              <span className="text-sm font-semibold text-white">{step.label}</span>
            </div>
            <div className="mt-2 text-xs leading-5 text-white/45">{step.description}</div>
          </div>
        );
      })}
    </div>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="rounded-2xl bg-black/18 px-4 py-3">
      <div className="text-xs text-white/38">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white/78">{value}</div>
    </div>
  );
}

function RequestAttachmentItem({ attachment, onPreviewImage }) {
  const isImage = attachment.type === "IMAGE" || attachment.mime?.startsWith("image/");

  if (isImage) {
    return (
      <button
        type="button"
        onClick={() => onPreviewImage?.({ src: attachment.data, name: attachment.name || "Ảnh đính kèm" })}
        className="group overflow-hidden rounded-2xl border border-white/10 bg-black/20 text-left"
      >
        <img src={attachment.data} alt={attachment.name} className="h-40 w-full object-cover transition group-hover:scale-[1.02]" />
        <div className="px-3 py-2 text-xs text-white/62">{attachment.name}</div>
      </button>
    );
  }

  return (
    <a href={attachment.data} download={attachment.name} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-white/70 hover:bg-white/10 hover:text-white">
      <FileText className="h-5 w-5" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{attachment.name}</span>
        <span className="block text-xs text-white/38">{attachment.mime || "File đính kèm"}</span>
      </span>
    </a>
  );
}

function formatRequestHistoryAction(action) {
  const labels = {
    CREATE_REQUEST: "Tạo yêu cầu",
    UPDATE_REQUEST: "Cập nhật thông tin",
    ASSIGN_REQUEST: "Phân công",
    CHANGE_STATUS: "Đổi trạng thái",
    ADD_COMMENT: "Thêm ghi chú",
  };

  return labels[action] || action || "Hoạt động";
}

function getRequestSlaState(request) {
  if (!request?.dueDate) {
    return {
      code: "NO_DUE",
      label: "Chưa có hạn",
      detail: "Chưa đặt hạn",
      note: "",
    };
  }

  const finalStatuses = ["HOAN_THANH", "TU_CHOI"];
  const dueTime = new Date(request.dueDate).getTime();
  const nowTime = Date.now();
  const diffMs = dueTime - nowTime;

  if (finalStatuses.includes(request.status?.code)) {
    return {
      code: "ON_TIME",
      label: "Đã đóng",
      detail: "Đã đóng",
      note: "",
    };
  }

  if (diffMs < 0) {
    return {
      code: "OVERDUE",
      label: "Quá hạn",
      detail: `Quá hạn ${formatDuration(Math.abs(diffMs))}`,
      note: `Yêu cầu đã vượt hạn xử lý ${formatDuration(Math.abs(diffMs))}. Cần ưu tiên rà soát, bổ sung ghi chú hoặc phân công lại nếu cần.`,
    };
  }

  if (diffMs <= 24 * 60 * 60 * 1000) {
    return {
      code: "DUE_SOON",
      label: "Sắp đến hạn",
      detail: `Còn ${formatDuration(diffMs)}`,
      note: `Yêu cầu còn ${formatDuration(diffMs)} trước hạn xử lý. Nên cập nhật trạng thái hoặc phản hồi nội bộ trước khi quá hạn.`,
    };
  }

  return {
    code: "ON_TIME",
    label: "Đúng hạn",
    detail: `Còn ${formatDuration(diffMs)}`,
    note: "",
  };
}

function formatDuration(milliseconds) {
  const totalHours = Math.max(1, Math.ceil(milliseconds / (60 * 60 * 1000)));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0 && hours > 0) {
    return `${days} ngày ${hours} giờ`;
  }

  if (days > 0) {
    return `${days} ngày`;
  }

  return `${totalHours} giờ`;
}

function WorkspaceOverview({ workspace, requests = [], activities = [], loading = false }) {
  const now = new Date();
  const chartMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: `T${date.getMonth() + 1}`,
      completed: 0,
      sent: 0,
      rejected: 0,
      overdue: 0,
    };
  });
  const chartMap = Object.fromEntries(chartMonths.map((item) => [item.key, item]));

  requests.forEach((request) => {
    const createdAt = request.createdAt ? new Date(request.createdAt) : null;
    const completedAt = request.completedAt ? new Date(request.completedAt) : createdAt;
    const statusCode = request.status?.code;
    const isOverdue = request.dueDate && new Date(request.dueDate) < now && statusCode !== "HOAN_THANH";

    if (createdAt) {
      const createdKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (chartMap[createdKey]) chartMap[createdKey].sent += 1;
      if (isOverdue && chartMap[createdKey]) chartMap[createdKey].overdue += 1;
      if (statusCode === "TU_CHOI" && chartMap[createdKey]) chartMap[createdKey].rejected += 1;
    }

    if (statusCode === "HOAN_THANH" && completedAt) {
      const completedKey = `${completedAt.getFullYear()}-${String(completedAt.getMonth() + 1).padStart(2, "0")}`;
      if (chartMap[completedKey]) chartMap[completedKey].completed += 1;
    }
  });

  const completedCount = requests.filter((request) => request.status?.code === "HOAN_THANH").length;
  const overdueCount = requests.filter((request) => request.dueDate && new Date(request.dueDate) < now && request.status?.code !== "HOAN_THANH").length;
  const totalRequests = requests.length;
  const activeCount = requests.filter((request) => !["HOAN_THANH", "TU_CHOI"].includes(request.status?.code)).length;
  const completionRate = totalRequests ? Math.round((completedCount / totalRequests) * 100) : 0;
  const statusSummary = buildOverviewBreakdown(requests, (request) => request.status?.name || "Chưa rõ");
  const prioritySummary = buildOverviewBreakdown(requests, (request) => request.priority?.name || "Chưa rõ");
  const typeSummary = buildOverviewBreakdown(requests, (request) => request.requestType?.name || "Chưa rõ");
  const requestActivities = requests.map((request) => {
    const statusCode = request.status?.code;
    const isOverdue = request.dueDate && new Date(request.dueDate) < now && statusCode !== "HOAN_THANH";
    const action = isOverdue
      ? "Quá hạn"
      : statusCode === "HOAN_THANH"
        ? "Hoàn thành"
        : statusCode === "TU_CHOI"
          ? "Từ chối"
          : "Gửi đi";

    return {
      id: request.id,
      title: request.title,
      code: request.requestCode,
      action,
      status: request.status?.name || "Chưa rõ",
      createdAt: request.completedAt || request.updatedAt || request.createdAt,
      time: formatShortDate(request.completedAt || request.updatedAt || request.createdAt),
    };
  });
  const workspaceActivities = activities.map((activity) => ({
    id: `workspace-${activity.id}`,
    title: activity.title,
    code: activity.actor?.fullName ? `Bởi ${activity.actor.fullName}` : "Workspace",
    action: formatWorkspaceActivityAction(activity.action),
    status: activity.description || activity.targetUser?.fullName || "",
    createdAt: activity.createdAt,
    time: formatShortDate(activity.createdAt),
  }));
  const recentActivities = [...workspaceActivities, ...requestActivities]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="rounded-[28px] border border-white/10 bg-white/7 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoBox label="Vai trò của bạn" value={workspace.currentMemberRole} />
          <InfoBox label="Thành viên" value={workspace.memberCount} />
          <InfoBox label="Hoàn thành" value={completedCount} />
          <InfoBox label="Quá hạn" value={overdueCount} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
          <section className="rounded-2xl border border-white/10 bg-black/18 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Hiệu suất theo tháng</div>
              </div>
              {loading && <span className="text-xs text-white/40">Đang tải...</span>}
            </div>
            <div className="mt-3 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartMonths}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.52)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "rgba(255,255,255,0.52)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#fff" }} />
                  <Bar dataKey="sent" name="Gửi đi" fill="#94A3B8" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="completed" name="Hoàn thành" fill="#34D399" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="rejected" name="Từ chối" fill="#FB7185" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="overdue" name="Quá hạn" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/18 p-4">
            <div className="text-sm font-semibold text-white">Hoạt động gần đây</div>
            <div className="mt-3 max-h-[300px] space-y-3 overflow-y-auto pr-1">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="rounded-2xl border border-white/8 bg-white/6 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/38">{activity.action}</span>
                      <span className="text-xs text-white/35">{activity.time}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">{activity.title}</div>
                    <div className="mt-1 text-xs text-white/45">{activity.code} · {activity.status}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/12 p-5 text-sm text-white/45">
                  Chưa có hoạt động yêu cầu để hiển thị.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <OverviewBreakdown title="Trạng thái" items={statusSummary} emptyText="Chưa có trạng thái" />
          <OverviewBreakdown title="Mức ưu tiên" items={prioritySummary} emptyText="Chưa có mức ưu tiên" />
          <section className="rounded-2xl border border-white/10 bg-black/18 p-4">
            <div className="text-sm font-semibold text-white">Xử lý</div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <MiniStat label="Tổng" value={totalRequests} />
              <MiniStat label="Đang mở" value={activeCount} />
              <MiniStat label="Tỷ lệ xong" value={`${completionRate}%`} />
            </div>
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-white/45">
                <span>Hoàn thành</span>
                <span>{completedCount}/{totalRequests || 0}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
            <div className="mt-4 border-t border-white/8 pt-3">
              <OverviewBreakdown title="Loại yêu cầu" items={typeSummary.slice(0, 3)} emptyText="Chưa có loại yêu cầu" compact />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function buildOverviewBreakdown(items, getLabel) {
  const counts = new Map();

  items.forEach((item) => {
    const label = getLabel(item);
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function OverviewBreakdown({ title, items, emptyText, compact = false }) {
  return (
    <section className={compact ? "" : "rounded-2xl border border-white/10 bg-black/18 p-4"}>
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className={compact ? "mt-3 space-y-2" : "mt-4 space-y-3"}>
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-white/6 px-3 py-2">
              <span className="truncate text-sm text-white/62">{item.label}</span>
              <span className="text-sm font-semibold text-white">{item.value}</span>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-sm text-white/42">{emptyText}</div>
        )}
      </div>
    </section>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-white/6 px-3 py-3">
      <div className="text-xs text-white/42">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function formatWorkspaceActivityAction(action) {
  const actionLabels = {
    MEMBER_JOINED: "Thành viên",
    MEMBER_LEFT: "Rời đi",
    MEMBER_ROLE_CHANGED: "Đổi quyền",
    MEMBER_REMOVED: "Xóa thành viên",
  };

  return actionLabels[action] || "Workspace";
}

function EmptyWorkspace({ onCreate, onJoin }) {
  return (
    <div className="max-w-3xl rounded-[28px] border border-white/10 bg-white/7 p-7">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black">
        <Building2 className="h-6 w-6" />
      </div>
      <h2 className="mt-6 text-3xl font-semibold text-white">Bạn chưa có workspace nào.</h2>
      <p className="mt-3 text-sm leading-6 text-white/58">Tạo workspace đầu tiên hoặc nhập mã mời bằng nút dấu cộng ở cột trái.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onCreate} className="app-button inline-flex items-center justify-center gap-2 px-5 py-3 text-sm">
          <Plus className="h-4 w-4" />
          Tạo workspace
        </button>
        <button type="button" onClick={onJoin} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/14 bg-white/7 px-5 py-3 text-sm font-semibold text-white/72 hover:bg-white/10">
          <Ticket className="h-4 w-4" />
          Nhập mã mời
        </button>
      </div>
    </div>
  );
}

function SelectWorkspacePrompt() {
  return (
    <div className="max-w-3xl rounded-[28px] border border-white/10 bg-white/7 p-7">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
        <Hash className="h-6 w-6" />
      </div>
      <h2 className="mt-6 text-3xl font-semibold text-white">Chọn workspace ở cột trái.</h2>
      <p className="mt-3 text-sm leading-6 text-white/58">
        Bấm vào một workspace để mở menu, xem tổng quan, thành viên, dự án, yêu cầu và hoạt động liên quan.
      </p>
    </div>
  );
}

function InviteConfirm({ loading, invite, submitting, onConfirm, onCancel }) {
  if (loading) {
    return <div className="py-4 text-sm text-white/58">Đang kiểm tra lời mời workspace...</div>;
  }

  if (!invite) {
    return <div className="py-4 text-sm text-white/58">Không có thông tin lời mời.</div>;
  }

  return (
    <div>
      <div className="rounded-2xl bg-white/7 p-4">
        <div className="text-xs font-semibold uppercase text-white/42">Workspace được mời</div>
        <h3 className="mt-2 text-2xl font-semibold text-white">{invite.name}</h3>
        <p className="mt-2 text-sm leading-6 text-white/58">{invite.description || "Workspace này chưa có mô tả."}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <InfoBox label="Mã mời" value={invite.inviteCode} mono />
          <InfoBox label="Thành viên" value={invite.memberCount} />
          <InfoBox label="Người tạo" value={invite.createdBy?.fullName || "Không rõ"} />
        </div>
      </div>

      {invite.alreadyMember && (
        <div className="mt-4 rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">Bạn đã là thành viên của workspace này.</div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onConfirm} disabled={submitting || invite.alreadyMember} className="app-button inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 text-sm disabled:opacity-60">
          <Check className="h-4 w-4" />
          {submitting ? "Đang tham gia..." : "Xác nhận tham gia"}
        </button>
        <button type="button" onClick={onCancel} className="inline-flex flex-1 items-center justify-center rounded-full border border-white/14 bg-white/7 px-5 py-3 text-sm font-semibold text-white/72 transition hover:bg-white/10">
          Hủy
        </button>
      </div>
    </div>
  );
}

function WorkspaceContextMenu({ menu, muted, isCreator, onMute, onInvite, onLeave, onClose }) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 cursor-default"
        role="presentation"
        onMouseDown={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-50 w-64 rounded-2xl border border-white/12 bg-[#211327] p-2 shadow-2xl"
        style={{ left: Math.min(menu.x, window.innerWidth - 280), top: Math.min(menu.y, window.innerHeight - 190) }}
      >
        <div className="mb-1 border-b border-white/10 px-3 py-2">
          <div className="truncate text-sm font-semibold text-white">{menu.workspace.name}</div>
          <div className="mt-0.5 text-xs text-white/40">{menu.workspace.memberCount} thành viên</div>
        </div>
        <button type="button" onClick={onMute} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/10">
          {muted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {muted ? "Bật thông báo" : "Tắt thông báo"}
        </button>
        <button type="button" onClick={onInvite} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/10">
          <Link2 className="h-4 w-4" />
          Invite
        </button>
        <button
          type="button"
          onClick={onLeave}
          disabled={isCreator}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-200 hover:bg-red-500/12 disabled:cursor-not-allowed disabled:text-white/32 disabled:hover:bg-transparent"
          title={isCreator ? "Người tạo workspace không thể thoát" : "Thoát khỏi workspace"}
        >
          <LogOut className="h-4 w-4" />
          Thoát khỏi workspace
        </button>
      </div>
    </>
  );
}

function InviteWorkspace({ workspace, onCopy }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-white/58">Gửi mã hoặc link mời này cho người cần tham gia workspace. Khi bấm link, họ sẽ thấy màn xác nhận tham gia.</p>
      <InfoBox label="Mã mời" value={workspace.inviteCode} mono />
      <InfoBox label="Link mời" value={workspace.inviteLink} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => onCopy(workspace.inviteCode)} className="app-button inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 text-sm">
          <Copy className="h-4 w-4" />
          Copy mã
        </button>
        <button type="button" onClick={() => onCopy(workspace.inviteLink)} className="app-button inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 text-sm">
          <Link2 className="h-4 w-4" />
          Copy link
        </button>
      </div>
    </div>
  );
}

function LeaveWorkspaceConfirm({ workspace, user, submitting, onConfirm, onCancel }) {
  const isCreator = workspace.createdById === user?.id;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white/7 p-4">
        <div className="text-sm font-semibold text-white">{workspace.name}</div>
        <div className="mt-1 text-sm leading-6 text-white/55">
          {isCreator
            ? "Bạn là người tạo workspace này nên không thể thoát khỏi workspace."
            : "Bạn sẽ không còn thấy workspace này trong danh sách sau khi xác nhận thoát."}
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting || isCreator}
          className="inline-flex flex-1 items-center justify-center rounded-full bg-red-500/90 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
        >
          {submitting ? "Đang xử lý..." : "Xác nhận thoát"}
        </button>
        <button type="button" onClick={onCancel} className="inline-flex flex-1 items-center justify-center rounded-full border border-white/14 bg-white/7 px-5 py-3 text-sm font-semibold text-white/72 transition hover:bg-white/10">
          Hủy
        </button>
      </div>
    </div>
  );
}

function DeleteWorkspaceConfirm({ workspace, user, submitting, onConfirm, onCancel }) {
  const canDeleteWorkspace = workspace.createdById === user?.id || workspace.currentMemberRole === "ADMIN";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-red-300/20 bg-red-500/12 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-red-100">
          <Trash2 className="h-4 w-4" />
          {workspace.name}
        </div>
        <div className="mt-2 text-sm leading-6 text-red-50/70">
          {canDeleteWorkspace
            ? "Workspace này sẽ bị xoá khỏi danh sách hoạt động của tất cả thành viên. Hành động này cần xác nhận trước khi tiếp tục."
            : "Chỉ admin workspace mới có quyền xoá workspace này."}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting || !canDeleteWorkspace}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-red-500/90 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {submitting ? "Đang xoá..." : "Xác nhận xoá"}
        </button>
        <button type="button" onClick={onCancel} className="inline-flex flex-1 items-center justify-center rounded-full border border-white/14 bg-white/7 px-5 py-3 text-sm font-semibold text-white/72 transition hover:bg-white/10">
          Hủy
        </button>
      </div>
    </div>
  );
}

function ChatAttachment({ message, mine, onPreviewImage }) {
  const linkClass = mine ? "text-black/70 hover:text-black" : "text-white/70 hover:text-white";
  const isVideo = message.attachmentMime?.startsWith("video/");

  if (isVideo) {
    return (
      <video
        src={message.attachmentData}
        controls
        className="max-h-64 max-w-full rounded-xl bg-black/40"
      />
    );
  }

  if (message.attachmentType === "IMAGE") {
    return (
      <button
        type="button"
        onClick={() => onPreviewImage?.({ src: message.attachmentData, name: message.attachmentName || "Ảnh đính kèm" })}
        className="block cursor-zoom-in"
      >
        <img src={message.attachmentData} alt={message.attachmentName || "Ảnh đính kèm"} className="max-h-56 rounded-xl object-cover" />
      </button>
    );
  }

  return (
    <a href={message.attachmentData} download={message.attachmentName || "file"} className={`flex items-center gap-2 rounded-xl ${mine ? "bg-black/8" : "bg-white/8"} px-3 py-2 ${linkClass}`}>
      <FileText className="h-4 w-4" />
      <span className="truncate">{message.attachmentName || "File đính kèm"}</span>
    </a>
  );
}

function ImagePreviewModal({ image, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      onMouseDown={onClose}
    >
      <div className="relative max-h-[92vh] max-w-[96vw]" onMouseDown={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-xl transition hover:bg-black/75"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={image.src}
          alt={image.name || "Ảnh đính kèm"}
          className="max-h-[88vh] max-w-[94vw] rounded-2xl object-contain shadow-2xl"
        />
      </div>
    </div>
  );
}

function Toast({ type, text }) {
  const tone = type === "error"
    ? "border-red-300/30 bg-red-500/20 text-red-50"
    : "border-emerald-300/30 bg-emerald-500/20 text-emerald-50";

  return (
    <div className={`fixed right-6 top-6 z-[80] max-w-md rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur-xl ${tone}`}>
      {text}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-md sm:items-center">
      <div className="flex max-h-[92svh] w-full max-w-xl flex-col overflow-hidden rounded-[30px] border border-white/12 bg-[#17151c] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full bg-white/10 p-2 text-white/70 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function FormActions({ submitting, submitLabel, onCancel }) {
  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row">
      <button type="submit" disabled={submitting} className="app-button inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 text-sm disabled:opacity-60">
        {submitting ? "Đang xử lý..." : submitLabel}
      </button>
      <button type="button" onClick={onCancel} className="inline-flex flex-1 items-center justify-center rounded-full border border-white/14 bg-white/7 px-5 py-3 text-sm font-semibold text-white/72 transition hover:bg-white/10">
        Hủy
      </button>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active = false, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium ${active ? "bg-white text-black" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function InfoBox({ label, value, mono = false }) {
  return (
    <div className="rounded-2xl bg-white/7 px-4 py-3">
      <div className="text-xs text-white/45">{label}</div>
      <div className={`mt-1 truncate text-lg font-semibold text-white ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function WorkspaceFormField({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-normal text-white/42">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function getWorkspaceInitials(name) {
  return String(name || "W")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function formatNotificationTime(value) {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function formatShortDate(value) {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function toDateInputValue(value) {
  if (!value) {
    return "";
  }

  try {
    const date = new Date(value);
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function getProjectProgress(project) {
  const summary = project?.workItemSummary;

  if (!summary?.total) {
    return 0;
  }

  return Math.round((summary.completed / summary.total) * 100);
}

function getProjectDueState(project) {
  if (!project) {
    return { label: "Chưa chọn dự án", className: "border-white/10 bg-white/8 text-white/50" };
  }

  if (project.status === "CLOSED") {
    return { label: "Đã đóng", className: "border-sky-300/20 bg-sky-500/12 text-sky-100" };
  }

  if (project.status === "ARCHIVED") {
    return { label: "Lưu trữ", className: "border-white/10 bg-white/8 text-white/45" };
  }

  if (!project.dueDate) {
    return { label: "Chưa đặt deadline", className: "border-white/10 bg-white/8 text-white/55" };
  }

  const now = new Date();
  const due = new Date(project.dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    return { label: `Quá hạn ${Math.abs(diffDays)} ngày`, className: "border-red-300/25 bg-red-500/14 text-red-50" };
  }

  if (diffDays <= 3) {
    return { label: `Sắp đến hạn: ${diffDays} ngày`, className: "border-amber-300/25 bg-amber-500/14 text-amber-50" };
  }

  return { label: `Còn ${diffDays} ngày`, className: "border-emerald-300/20 bg-emerald-500/12 text-emerald-50" };
}

function getAllowedProjectWorkItemParents(items, type, selectedItemId = null) {
  if (type === "STORY") {
    return [];
  }

  const expectedParentType = type === "SUB_TASK" ? "TASK" : "STORY";

  return (items || []).filter((item) => item.id !== selectedItemId && item.type === expectedParentType);
}

function buildProjectTimelineRows(items = []) {
  const byParent = new Map();
  const byId = new Map();

  items.forEach((item) => {
    byId.set(item.id, item);
    const key = item.parentId || 0;
    byParent.set(key, [...(byParent.get(key) || []), item]);
  });

  const sortItems = (values) => [...values].sort((a, b) => {
    const typeOrder = { STORY: 0, TASK: 1, SUB_TASK: 2 };
    return (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9)
      || new Date(a.startDate || a.dueDate || a.createdAt || 0) - new Date(b.startDate || b.dueDate || b.createdAt || 0)
      || a.id - b.id;
  });

  const rows = [];
  const visited = new Set();

  function addItem(item, level) {
    if (!item || visited.has(item.id)) return;
    visited.add(item.id);
    rows.push({ item, level });
    sortItems(byParent.get(item.id) || []).forEach((child) => addItem(child, Math.min(level + 1, 2)));
  }

  sortItems(items.filter((item) => !item.parentId || !byId.has(item.parentId))).forEach((item) => addItem(item, 0));
  sortItems(items.filter((item) => !visited.has(item.id))).forEach((item) => addItem(item, 0));

  return rows;
}

function getProjectTimelineBounds(project, items = []) {
  const dates = [];

  if (project?.startDate) dates.push(new Date(project.startDate));
  if (project?.dueDate) dates.push(new Date(project.dueDate));

  items.forEach((item) => {
    if (item.startDate) dates.push(new Date(item.startDate));
    if (item.dueDate) dates.push(new Date(item.dueDate));
    if (!item.startDate && !item.dueDate && item.createdAt) dates.push(new Date(item.createdAt));
  });

  const validDates = dates.filter((date) => !Number.isNaN(date.getTime()));
  const now = new Date();
  const minTime = validDates.length ? Math.min(...validDates.map((date) => date.getTime())) : now.getTime();
  const maxTime = validDates.length ? Math.max(...validDates.map((date) => date.getTime())) : now.getTime() + 14 * 24 * 60 * 60 * 1000;
  const padding = 3 * 24 * 60 * 60 * 1000;

  return {
    start: new Date(minTime - padding),
    end: new Date(Math.max(maxTime + padding, minTime + 14 * 24 * 60 * 60 * 1000)),
  };
}

function getProjectTimelineTicks(start, end) {
  const ticks = [];
  const span = end.getTime() - start.getTime();

  for (let index = 0; index < 4; index += 1) {
    const date = new Date(start.getTime() + (span * index) / 3);
    ticks.push({ key: date.toISOString(), label: formatShortDate(date) });
  }

  return ticks;
}

function getTimelineBarStyle(item, start, end) {
  const startDate = item.startDate ? new Date(item.startDate) : item.dueDate ? new Date(item.dueDate) : item.createdAt ? new Date(item.createdAt) : null;
  const dueDate = item.dueDate ? new Date(item.dueDate) : startDate ? new Date(startDate.getTime() + 24 * 60 * 60 * 1000) : null;

  if (!startDate || !dueDate || Number.isNaN(startDate.getTime()) || Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const total = Math.max(end.getTime() - start.getTime(), 1);
  const left = Math.max(0, Math.min(100, ((startDate.getTime() - start.getTime()) / total) * 100));
  const right = Math.max(0, Math.min(100, ((dueDate.getTime() - start.getTime()) / total) * 100));
  const width = Math.max(2, right - left);

  return {
    left: `${left}%`,
    width: `${Math.min(width, 100 - left)}%`,
  };
}

function getWorkItemStatusClass(status) {
  const classes = {
    TODO: "bg-white/12 text-white/62",
    IN_PROGRESS: "bg-sky-400/16 text-sky-100",
    REVIEW: "bg-violet-400/16 text-violet-100",
    DONE: "bg-emerald-400/16 text-emerald-100",
    BLOCKED: "bg-red-400/16 text-red-100",
  };

  return classes[status] || classes.TODO;
}

function isWorkItemOverdue(item) {
  return Boolean(item?.dueDate && item.status !== "DONE" && new Date(item.dueDate) < new Date());
}

function getWorkItemLoggedMinutes(item) {
  return (item?.workLogs || []).reduce((total, log) => total + Number(log.minutes || 0), 0);
}

function formatWorkMinutes(minutes) {
  const normalizedMinutes = Number(minutes || 0);

  if (!normalizedMinutes) {
    return "0m";
  }

  const hours = Math.floor(normalizedMinutes / 60);
  const restMinutes = normalizedMinutes % 60;

  if (!hours) {
    return `${restMinutes}m`;
  }

  if (!restMinutes) {
    return `${hours}h`;
  }

  return `${hours}h ${restMinutes}m`;
}

function isOldProject(project) {
  if (!project) {
    return false;
  }

  if (["CLOSED", "ARCHIVED"].includes(project.status)) {
    return true;
  }

  return Boolean(project.dueDate && new Date(project.dueDate) < new Date());
}

function getTodayInputDate() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getDateInputAfterHours(hours) {
  const normalizedHours = Number(hours || 0);

  if (!Number.isFinite(normalizedHours) || normalizedHours <= 0) {
    return "";
  }

  const date = new Date(Date.now() + normalizedHours * 60 * 60 * 1000);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function formatSlaHours(hours) {
  const normalizedHours = Number(hours || 0);

  if (!normalizedHours) {
    return "Chưa đặt SLA";
  }

  const days = Math.floor(normalizedHours / 24);
  const restHours = normalizedHours % 24;

  if (days && restHours) {
    return `${days} ngày ${restHours} giờ`;
  }

  if (days) {
    return `${days} ngày`;
  }

  return `${normalizedHours} giờ`;
}

function normalizeRequestTypeCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function normalizeProjectCode(value) {
  return normalizeRequestTypeCode(value);
}

function formatLatestMessage(message, currentUserId, fallbackUsername) {
  if (!message) {
    return `@${fallbackUsername}`;
  }

  const prefix = message.senderId === currentUserId ? "Bạn: " : "";
  return `${prefix}${message.content}`;
}

function resolveNotificationPath(link) {
  if (!link) {
    return "/workspaces";
  }

  try {
    const url = new URL(link);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return link;
  }
}

