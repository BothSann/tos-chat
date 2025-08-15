import Logo from "@/components/Logo";
import Link from "next/link";

export default function LoginForm() {
  return (
    <div className="w-full max-w-sm">
      <div className="space-y-6">
        <Logo />
        <h2 className="text-center font-bold text-2xl">
          Sign in to your account
        </h2>
      </div>

      <form action="#" method="POST" className="space-y-6 mt-12">
        {/* Email */}
        <div>
          <label htmlFor="email">Email address</label>
          <div className="mt-2">
            <input
              type="email"
              id="email"
              name="email"
              className="bg-white/5 block w-full rounded-md px-3 py-1.5 outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-amber-500 sm:text-sm/6"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password">Password</label>
          <div className="mt-2">
            <input
              type="password"
              id="password"
              name="password"
              className="bg-white/5 block w-full rounded-md px-3 py-1.5 outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-amber-500 sm:text-sm/6"
            />
          </div>
        </div>

        {/* Login Button */}
        <div>
          <button
            type="submit"
            className="text-sm font-semibold bg-amber-500 w-full px-4 py-2 rounded-md hover:bg-amber-400 cursor-pointer"
          >
            Sign in
          </button>
        </div>
      </form>
      <p className="mt-10 text-center text-sm/6 text-gray-400 flex justify-center items-center gap-1">
        Don&apos;t have an account?
        <Link href="/register" className="font-semibold text-amber-500">
          Create an account
        </Link>
      </p>
    </div>
  );
}
