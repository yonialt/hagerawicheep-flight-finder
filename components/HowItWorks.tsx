const steps = [
  {
    n: "01",
    title: "Tell us where you're headed",
    body: "Search any route inside Ethiopia or abroad — we check every airline and fare class flying it, not just one carrier.",
  },
  {
    n: "02",
    title: "We compare every fare",
    body: "Including the ones airlines don't show first: split-ticket routings, partner-airline seats, and off-peak dates.",
  },
  {
    n: "03",
    title: "Book the cheapest, real fare",
    body: "You book directly with the airline or agent at the price we found — no markup, no hidden service fee.",
  },
];

export default function HowItWorks() {
  return (
    <section className="how" aria-labelledby="how-heading">
      <h2 id="how-heading">Why your ticket costs less here</h2>
      <p className="how-sub">
        Most Ethiopians default to booking straight through Ethiopian Airlines. It's trusted, but rarely the
        cheapest option on the shelf — we search everything else too.
      </p>

      <ol className="how-steps">
        {steps.map((s) => (
          <li key={s.n} className="how-step">
            <span className="how-n" aria-hidden="true">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
