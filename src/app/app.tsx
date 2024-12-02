"use client";

import dynamic from "next/dynamic";

const Swap = dynamic(() => import("~/components/Swap"), {
  ssr: false,
});

export default function App({ token } : { token: string }) {
  return <Swap token={token} />;
}
