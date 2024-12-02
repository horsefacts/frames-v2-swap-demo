import { Metadata } from "next";
import App from "~/app/app";

const appUrl = process.env.NEXT_PUBLIC_URL;

export const revalidate = 300;

interface Props {
  searchParams: Promise<{
    token: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const { token } = await searchParams;

  const frame = {
    version: "next",
    imageUrl: `${appUrl}/opengraph-image`,
    button: {
      title: `Swap ETH/${token === "clanker" ? "CLANKER" : "USDC"}`,
      action: {
        type: "launch_frame",
        name: "Frames v2 Swap Demo",
        url: `${appUrl}/swap/?token=${token}`,
        splashImageUrl: `${appUrl}/splash.png`,
        splashBackgroundColor: "#f7f7f7",
      },
    },
  };

  return {
    title: "Frames v2 Swap Demo",
    openGraph: {
      title: "Frames v2 Swap Demo",
      description: "A Farcaster Frames v2 demo app.",
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

export default async function Home({ searchParams }: Props) {
  const { token } = await searchParams;
  return <App token={token} />;
}
