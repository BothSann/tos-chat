import Logo from "@/components/Logo";
import Link from "next/link";

export default function RegisterForm() {
  return (
    <div className="w-full max-w-sm">
      <div className="space-y-6">
        <Logo />
        <h2 className="text-center font-bold text-2xl">Create an account</h2>
      </div>

      <form action="#" method="POST" className="space-y-6 mt-12">
        {/* Full name */}
        <div>
          <label>Full name</label>
          <div className="mt-2">
            <input
              type="text"
              id="full-name"
              name="full-name"
              className="bg-white/5 block w-full rounded-md px-3 py-1.5 outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-amber-500 sm:text-sm/6"
            />
          </div>
        </div>

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

        {/* Confirm password */}
        <div>
          <label htmlFor="confirm-password">Confirm password</label>
          <div className="mt-2">
            <input
              type="password"
              id="confirm-password"
              name="confirm-password"
              className="bg-white/5 block w-full rounded-md px-3 py-1.5 outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-amber-500 sm:text-sm/6"
            />
          </div>
        </div>

        {/* Create account button */}
        <div>
          <button
            type="submit"
            className="text-sm font-semibold bg-amber-500 w-full px-4 py-2 rounded-md hover:bg-amber-400 cursor-pointer"
          >
            Create account
          </button>
        </div>
      </form>

      <p className="mt-10 text-center text-sm/6 text-gray-400 flex justify-center items-center gap-1">
        Already have an account?
        <Link href="/login" className="font-semibold text-amber-500">
          Sign in
        </Link>
      </p>
    </div>
  );
}
