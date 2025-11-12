import { loginWithGoogle } from "./actions";
import Image from "next/image";

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl border border-neutral-200 max-w-sm w-full">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold mb-3">
            Sign In
          </h1>
          <div className="flex justify-center mb-3">
            <div className="button-depth relative w-20 h-20 rounded-lg overflow-hidden border border-neutral-300">
              <Image
                src="/logo.png"
                alt="Bulldog Mapping"
                width={80}
                height={80}
                className="object-cover"
              />
            </div>
          </div>
          <p className="text-gray-600 text-sm">
            Create events and discover campus spots.
          </p>
        </div>

        <form>
          <button
            formAction={loginWithGoogle}
            className="button-depth w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-lg border border-blue-700 hover:bg-blue-700 transition-[transform_background-color] duration-150 ease-out-2 cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
          >
            <Image
              src="https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png"
              alt="Google"
              width={24}
              height={24}
              className="object-contain"
            />
            Sign in with Google
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            className="text-gray-600 text-sm hover:text-gray-900 underline hover:no-underline transition-colors duration-150 ease-out-2 cursor-pointer"
          >
            Do It Later
          </button>
        </div>
      </div>
    </div>
  );
}

