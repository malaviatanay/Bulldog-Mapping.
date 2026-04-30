"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UserRound, Shield, SlidersHorizontal, Camera, Check, Loader2, Bell, CalendarClock, BellOff } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useNotifications } from "@/context/NotificationContext";

type SettingsTab = "about" | "security" | "preferences";

type SettingsProps = {
  user: User | null;
};

export default function Settings({ user }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("about");

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "about", label: "About", icon: <UserRound className="w-4 h-4" /> },
    { id: "security", label: "Security", icon: <Shield className="w-4 h-4" /> },
    { id: "preferences", label: "Preferences", icon: <SlidersHorizontal className="w-4 h-4" /> },
  ];

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4 dark:text-gray-100">Settings</h2>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer ${
              activeTab === tab.id
                ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "about" && <AboutSection user={user} />}
        {activeTab === "security" && <SecuritySection user={user} />}
        {activeTab === "preferences" && <PreferencesSection />}
      </div>
    </div>
  );
}

function AboutSection({ user }: { user: User | null }) {
  const router = useRouter();
  const supabase = createClient();

  const currentName = user?.user_metadata?.name || "";
  const nameParts = currentName.split(" ");
  const [firstName, setFirstName] = useState(nameParts[0] || "");
  const [lastName, setLastName] = useState(nameParts.slice(1).join(" ") || "");
  const [avatarUrl, setAvatarUrl] = useState<string>(
    user?.user_metadata?.picture || ""
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Allowlist concrete raster types only — SVG can carry executable JS via
    // <script> blocks and is unsafe to host on the same origin we render from.
    const ALLOWED_TYPES: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/webp": "webp",
    };
    const allowedExt = ALLOWED_TYPES[file.type.toLowerCase()];
    if (!allowedExt) {
      setMessage({
        type: "error",
        text: "Please use a PNG, JPEG, or WEBP image.",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be less than 2MB." });
      return;
    }

    // Verify the file's magic bytes match the claimed type — a malicious file
    // can claim image/png but actually be SVG or HTML.
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const matchesPng =
      head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
    const matchesJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    const matchesWebp =
      head[0] === 0x52 &&
      head[1] === 0x49 &&
      head[2] === 0x46 &&
      head[3] === 0x46 &&
      head[8] === 0x57 &&
      head[9] === 0x45 &&
      head[10] === 0x42 &&
      head[11] === 0x50;
    const validHeader =
      (allowedExt === "png" && matchesPng) ||
      (allowedExt === "jpg" && matchesJpeg) ||
      (allowedExt === "webp" && matchesWebp);
    if (!validHeader) {
      setMessage({
        type: "error",
        text: "That file doesn't look like a valid image.",
      });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const filePath = `${user.id}/avatar.${allowedExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        setMessage({ type: "error", text: "Failed to upload image. Please try again." });
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(publicUrl);

      await supabase.auth.updateUser({
        data: { picture: publicUrl },
      });

      setMessage({ type: "success", text: "Profile picture updated!" });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error } = await supabase.auth.updateUser({
        data: {
          name: fullName,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ type: "success", text: "Profile updated successfully!" });
        router.refresh();
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        <p>Please log in to manage your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Profile Picture */}
      <div className="flex flex-col items-center">
        <div className="relative group">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Profile"
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <UserRound className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer">
            {uploading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-xs text-gray-400 mt-2">Click to change photo</p>
      </div>

      {/* Name Fields */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="First name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Last name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={user.email || ""}
            disabled
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
          />
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="button-depth w-full bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg border border-blue-700 hover:bg-blue-700 transition-[transform_background-color] duration-150 ease-out-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Check className="w-4 h-4" />
        )}
        Save Changes
      </button>
    </div>
  );
}

function SecuritySection({ user }: { user: User | null }) {
  const supabase = createClient();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isGoogleUser = user?.app_metadata?.provider === "google";

  const handleChangePassword = async () => {
    if (!user) return;

    setMessage(null);

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    setSaving(true);

    try {
      // Verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        setMessage({ type: "error", text: "Current password is incorrect." });
        setSaving(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ type: "success", text: "Password updated successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        <p>Please log in to manage security settings.</p>
      </div>
    );
  }

  if (isGoogleUser) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 font-medium mb-1">Google Account</p>
          <p className="text-xs text-blue-600">
            Your account is managed through Google. To change your password, visit your Google Account settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Change the password for your account.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Enter current password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="At least 6 characters"
            minLength={6}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Re-enter new password"
            minLength={6}
          />
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        onClick={handleChangePassword}
        disabled={saving || !currentPassword || !newPassword || !confirmPassword}
        className="button-depth w-full bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg border border-blue-700 hover:bg-blue-700 transition-[transform_background-color] duration-150 ease-out-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Shield className="w-4 h-4" />
        )}
        Update Password
      </button>
    </div>
  );
}

function ThemePreviewCard({
  mode,
  label,
  selected,
  onClick,
}: {
  mode: "light" | "dark" | "auto";
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  // Auto shows a split preview (left light, right dark)
  const isAuto = mode === "auto";
  const isDark = mode === "dark";

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 cursor-pointer group">
      <div
        className={`w-[90px] h-[62px] rounded-lg overflow-hidden border-2 transition-all duration-150 ${
          selected
            ? "border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.5)]"
            : "border-gray-300 dark:border-gray-600 group-hover:border-gray-400 dark:group-hover:border-gray-500"
        }`}
      >
        {isAuto ? (
          <div className="w-full h-full flex">
            {/* Left half: dark */}
            <div className="w-1/2 h-full bg-[#1e2a3a] flex flex-col p-1.5 gap-1">
              <div className="flex gap-[3px]">
                <div className="w-[5px] h-[5px] rounded-full bg-red-400" />
                <div className="w-[5px] h-[5px] rounded-full bg-yellow-400" />
                <div className="w-[5px] h-[5px] rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex flex-col gap-0.5 mt-0.5">
                <div className="h-[5px] w-full rounded-sm bg-blue-500/70" />
                <div className="h-[5px] w-[80%] rounded-sm bg-blue-400/50" />
                <div className="h-[5px] w-[60%] rounded-sm bg-gray-500/40" />
              </div>
            </div>
            {/* Right half: light */}
            <div className="w-1/2 h-full bg-[#e8ecf0] flex flex-col p-1.5 gap-1">
              <div className="flex gap-[3px]">
                <div className="w-[5px] h-[5px] rounded-full bg-red-400" />
                <div className="w-[5px] h-[5px] rounded-full bg-yellow-400" />
                <div className="w-[5px] h-[5px] rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex flex-col gap-0.5 mt-0.5">
                <div className="h-[5px] w-full rounded-sm bg-blue-500/60" />
                <div className="h-[5px] w-[80%] rounded-sm bg-blue-400/40" />
                <div className="h-[5px] w-[60%] rounded-sm bg-gray-400/40" />
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`w-full h-full flex flex-col p-2 gap-1 ${
              isDark ? "bg-[#1e2a3a]" : "bg-[#e8ecf0]"
            }`}
          >
            <div className="flex gap-[3px]">
              <div className="w-[5px] h-[5px] rounded-full bg-red-400" />
              <div className="w-[5px] h-[5px] rounded-full bg-yellow-400" />
              <div className="w-[5px] h-[5px] rounded-full bg-green-400" />
            </div>
            <div className="flex-1 flex flex-col gap-0.5 mt-0.5">
              <div
                className={`h-[5px] w-full rounded-sm ${
                  isDark ? "bg-blue-500/70" : "bg-blue-500/60"
                }`}
              />
              <div
                className={`h-[5px] w-[80%] rounded-sm ${
                  isDark ? "bg-blue-400/50" : "bg-blue-400/40"
                }`}
              />
              <div
                className={`h-[5px] w-[60%] rounded-sm ${
                  isDark ? "bg-gray-500/40" : "bg-gray-400/40"
                }`}
              />
            </div>
          </div>
        )}
      </div>
      <span
        className={`text-xs font-medium transition-colors ${
          selected
            ? "text-blue-600 dark:text-blue-400"
            : "text-gray-600 dark:text-gray-400"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function NotificationToggle({
  icon,
  label,
  description,
  enabled,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-gray-500 dark:text-gray-400">{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          enabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function PreferencesSection() {
  const { theme, setTheme } = useTheme();
  const {
    prefs,
    permission,
    setClassReminders,
    setEventNotifications,
    setReminderMinutes,
    requestPermission,
    sendTestNotification,
  } = useNotifications();

  const reminderOptions = [5, 10, 15, 30, 60];
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Customize your experience.
      </p>

      {/* Theme Toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Appearance
        </label>
        <div className="flex justify-center gap-4">
          <ThemePreviewCard
            mode="auto"
            label="Auto"
            selected={theme === "auto"}
            onClick={() => setTheme("auto")}
          />
          <ThemePreviewCard
            mode="light"
            label="Light"
            selected={theme === "light"}
            onClick={() => setTheme("light")}
          />
          <ThemePreviewCard
            mode="dark"
            label="Dark"
            selected={theme === "dark"}
            onClick={() => setTheme("dark")}
          />
        </div>
      </div>

      {/* Notifications */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Notifications
        </label>

        {/* Browser permission banner */}
        {permission !== "granted" && (
          <div
            className={`mb-3 p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              permission === "denied"
                ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300"
                : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300"
            }`}
          >
            {permission === "denied" ? (
              <BellOff className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <Bell className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-medium mb-0.5">
                {permission === "denied"
                  ? "Browser notifications blocked"
                  : "Enable browser notifications"}
              </p>
              <p className="opacity-80 mb-1.5">
                {permission === "denied"
                  ? "Allow notifications for this site in your browser settings to get alerts."
                  : "You'll still see notifications in the bell menu, but enable this to get alerts while the tab is in the background."}
              </p>
              {permission === "default" && (
                <button
                  onClick={() => requestPermission()}
                  className="font-medium bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Enable
                </button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <NotificationToggle
            icon={<CalendarClock className="w-4 h-4" />}
            label="Class Reminders"
            description="Get notified before your classes start"
            enabled={prefs.classReminders}
            onToggle={() => setClassReminders(!prefs.classReminders)}
          />
          {prefs.classReminders && (
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/30">
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Remind me
              </label>
              <select
                value={prefs.reminderMinutes}
                onChange={(e) => setReminderMinutes(parseInt(e.target.value, 10))}
                className="text-xs font-medium px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {reminderOptions.map((m) => (
                  <option key={m} value={m}>
                    {m} min before
                  </option>
                ))}
              </select>
            </div>
          )}
          <NotificationToggle
            icon={<Bell className="w-4 h-4" />}
            label="Event Notifications"
            description="Get notified about new and upcoming campus events"
            enabled={prefs.eventNotifications}
            onToggle={() => setEventNotifications(!prefs.eventNotifications)}
          />
        </div>

        {isDev && (
          <div className="mt-3 p-3 rounded-lg border border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Dev tools
              </p>
              <span className="text-[10px] text-amber-600/70 dark:text-amber-500/70">
                development only
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => sendTestNotification("class")}
                className="flex-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Test class reminder
              </button>
              <button
                onClick={() => sendTestNotification("event")}
                className="flex-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Test event notif
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
