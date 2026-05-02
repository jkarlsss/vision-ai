import { redirect } from "next/navigation";

import { editorPath } from "@/lib/auth-routes";

export default function Home() {
  redirect(editorPath);
}
