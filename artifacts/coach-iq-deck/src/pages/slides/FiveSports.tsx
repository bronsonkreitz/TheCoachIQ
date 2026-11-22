const base = import.meta.env.BASE_URL;

export default function FiveSports() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text flex flex-col">
      <div className="px-[6vw] pt-[8vh] grid grid-cols-12 gap-[2vw] items-end">
        <h2 className="col-span-7 font-display font-black uppercase text-[5.4vw] leading-[0.9] tracking-tight">Five sports. <span className="text-primary">One familiar experience.</span></h2>
        <div className="col-span-5 flex flex-col gap-[2vh] text-[2vw] leading-snug text-muted">
          <p className="text-text">Baseball, Soccer, Football, Basketball, and Hockey</p>
          <p>Shared dashboards, with sport-specific positions and statistics</p>
          <p>Dedicated tools for each sport’s coaching needs</p>
        </div>
      </div>
      <div className="mt-[6vh] flex-1 grid grid-cols-5 gap-[0.4vw]">
        <div className="relative overflow-hidden">
          <img src={`${base}baseball.jpg`} crossOrigin="anonymous" alt="Baseball" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-[0.8vh] bg-orange" />
          <span className="absolute bottom-[3vh] left-[1.6vw] font-display font-black uppercase text-[3vw]">Baseball</span>
        </div>
        <div className="relative overflow-hidden">
          <img src={`${base}soccer.jpg`} crossOrigin="anonymous" alt="Soccer" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-[0.8vh] bg-green" />
          <span className="absolute bottom-[3vh] left-[1.6vw] font-display font-black uppercase text-[3vw]">Soccer</span>
        </div>
        <div className="relative overflow-hidden">
          <img src={`${base}football.jpg`} crossOrigin="anonymous" alt="Football" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-[0.8vh] bg-violet" />
          <span className="absolute bottom-[3vh] left-[1.6vw] font-display font-black uppercase text-[3vw]">Football</span>
        </div>
        <div className="relative overflow-hidden">
          <img src={`${base}basketball.jpg`} crossOrigin="anonymous" alt="Basketball" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-[0.8vh] bg-primary" />
          <span className="absolute bottom-[3vh] left-[1.6vw] font-display font-black uppercase text-[3vw]">Basketball</span>
        </div>
        <div className="relative overflow-hidden">
          <img src={`${base}hockey.jpg`} crossOrigin="anonymous" alt="Hockey" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-[0.8vh] bg-accent" />
          <span className="absolute bottom-[3vh] left-[1.6vw] font-display font-black uppercase text-[3vw]">Hockey</span>
        </div>
      </div>
    </div>
  );
}
