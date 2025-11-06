import { login, signup } from "./actions";
import { loginWithGoogle } from "./actions";

function LoginPage() {
  return (
    <>
      <form>
        <button className="px-2 py-2 text-white outline-1 outline-neutral-400 bg-blue-400" formAction={loginWithGoogle}>Sign in with google</button>
      </form>
    </>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-sm w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">
          Sign In
        </h1>
        <img
          className="h-12 w-full object-contain mx-auto"
          src="https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png"
          alt="google image"
        />
        <p className="text-gray-600 text-lg mb-6 text-center">
          Sign in to access user features.
        </p>
        <form>
          <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md w-full transition duration-300 ease-in-out" formAction={loginWithGoogle}>Sign in with Google</button>
        </form>
      </div>
    </div>
  );
}

