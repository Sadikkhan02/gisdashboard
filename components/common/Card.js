export default function Card({ children, title, className = '' }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 text-slate-900 shadow-sm ${className}`}>
      {title && <h3 className="mb-3 font-semibold text-slate-950">{title}</h3>}
      {children}
    </div>
  );
}
