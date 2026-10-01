import Image from "next/image";

const columns = [
  {
    heading: "Explore",
    links: ["Local flights", "International flights", "Deals of the week", "Airline coverage"],
  },
  {
    heading: "Support",
    links: ["Help center", "Manage a booking", "Contact us", "Fare alerts"],
  },
  {
    heading: "Company",
    links: ["About us", "How we compare fares", "Careers", "Press"],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Image src="/images/hagerawi-logo.svg" alt="ሃገራዊ" width={48} height={49} className="footer-logo" />
          <p>
            Independent fare search for Ethiopian travelers — comparing local and international flights so you
            don't have to pay full price by default.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.heading} className="footer-col">
            <h4>{col.heading}</h4>
            <ul>
              {col.links.map((l) => (
                <li key={l}><a href="#">{l}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} ሃገራዊ. Fares shown are estimates and change with availability.</span>
        <div className="footer-legal">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
      </div>
    </footer>
  );
}
