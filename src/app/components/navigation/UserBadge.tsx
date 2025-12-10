"use client";
import Image from "next/image";
import { User } from "@supabase/supabase-js";
import { logout } from "@/app/login/actions";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";

export default function UserBadge({ userData, isAdmin }: { userData: User | null; isAdmin: boolean }) {
  const user = userData;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 cursor-pointer hover:bg-neutral-50 p-2 rounded-md transition-opacity">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            {user && user.user_metadata?.picture ? (
              <Image
                width={32}
                height={32}
                quality={50}
                className="w-full h-full object-cover"
                alt="User Picture"
                src={user.user_metadata.picture}
              />
            ) : (
              <Image
                width={32}
                height={32}
                quality={50}
                alt="Doodle of bulldog"
                className="w-full h-full object-cover"
                src={"/logo.png"}
              />
            )}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">
              {user && user.user_metadata.name
                ? user.user_metadata.name.split(" ")[0]
                : "V.E. Bulldog"}
            </span>
            {isAdmin && user && (
              <span className="text-xs text-gray-500">Admin</span>
            )}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-fit">
        {user ? (
          <>
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  {user.user_metadata?.name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form>
                <button
                  formAction={logout}
                  className="w-full flex items-center text-red-600 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </button>
              </form>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem asChild>
            <Link href="/login" className="cursor-pointer">
              Login
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
