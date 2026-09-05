import CardSwap, { Card } from "@/components/CardSwap";

const CARDS = [
  {
    label: "01",
    title: "Design",
    body: "Sketch the flow before you write a single line of code.",
  },
  {
    label: "02",
    title: "Build",
    body: "Ship fast with components that are easy to compose.",
  },
  {
    label: "03",
    title: "Animate",
    body: "Bring the interface to life with GSAP-driven motion.",
  },
];

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-1 flex-col justify-center overflow-hidden bg-black px-6 py-24 sm:px-16">
      <div className="relative z-10 max-w-xl">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-zinc-500">
          CardSwap
        </p>
        <h1 className="text-4xl font-semibold leading-tight text-white sm:text-6xl">
          Stack your ideas.
          <br />
          Swap them into place.
        </h1>
        <p className="mt-6 max-w-md text-lg text-zinc-400">
          A 3D card carousel that keeps cycling through your content, built
          with React and GSAP.
        </p>
      </div>

      <div className="relative mt-16 h-[360px] w-full sm:mt-0 sm:h-screen sm:w-auto">
        <CardSwap
          cardDistance={60}
          verticalDistance={70}
          delay={4000}
          pauseOnHover
        >
          {CARDS.map((c) => (
            <Card key={c.label} className="flex flex-col justify-between p-6">
              <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                {c.label}
              </span>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {c.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-400">{c.body}</p>
              </div>
            </Card>
          ))}
        </CardSwap>
      </div>
    </main>
  );
}
