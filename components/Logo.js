import { taprom, roboto } from "@/lib/fonts";

export default function Logo({ textSize = "text-6xl" }) {
  return (
    <div>
      <h1 className={`${taprom.className} ${textSize} font-bold text-center`}>
        តោះ<span className="text-amber-500">ឆាត</span>
        <span> TosChat</span>
      </h1>
    </div>
  );
}
