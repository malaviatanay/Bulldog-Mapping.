"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UserRound, Shield, SlidersHorizontal, Camera, Check, Loader2 } from "lucide-react";

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
      <h2 className="text-xl font-semibold mb-4">Settings</h2>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer ${
              activeTab === tab.id
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
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

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file." });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be less than 2MB." });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

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

function PreferencesSection() {
  return (
    <div className="text-center py-8">
      <SlidersHorizontal className="w-8 h-8 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-500 font-medium">Preferences</p>
      <p className="text-xs text-gray-400 mt-1">
        Coming soon! Customization options will appear here.
      </p>
    </div>
  );
}
