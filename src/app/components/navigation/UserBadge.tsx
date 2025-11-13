"use client";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function UserBadge() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error);
        setLoading(false);
        return;
      }
      console.log("Current user:", user);
      setUser(user);
      setLoading(false);
    };
    fetchUser();
  }, []);
  return (
    <div className="flex">
      <div className="w-full h-full my-auto mx-auto aspect-square rounded-lg overflow-hidden">
        {user && user.user_metadata?.picture && !loading ? (
          <Image
            width={30}
            height={30}
            className="w-full h-full"
            alt="User Picture"
            src={user.user_metadata.picture}
          ></Image>
        ) : (
          <Image
            width={30}
            height={30}
            alt="Doodle of bulldog"
            className="w-full h-full"
            src={"/logo.png"}
          ></Image>
        )}
      </div>
      <p className="flex flex-col">
        <span>
          {user && user.user_metadata.name
            ? user.user_metadata.name.split(" ")[0]
            : "Bulldog"}
        </span>
        <span></span>
      </p>
    </div>
  );
}
