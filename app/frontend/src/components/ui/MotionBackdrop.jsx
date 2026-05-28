export function MotionBackdrop({ fixed = false, intensity = "strong" }) {
  return (
    <div className={`motion-backdrop ${fixed ? "fixed" : "absolute"} inset-0 overflow-hidden motion-backdrop--${intensity}`}>
      <div className="motion-backdrop__grid" />
      <div className="motion-backdrop__field" />
      <div className="motion-backdrop__beam motion-backdrop__beam--one" />
      <div className="motion-backdrop__beam motion-backdrop__beam--two" />
      <div className="motion-backdrop__beam motion-backdrop__beam--three" />
      <div className="motion-backdrop__scan" />
      <div className="motion-backdrop__shade" />
    </div>
  );
}
