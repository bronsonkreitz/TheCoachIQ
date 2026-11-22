export default function SportTools() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg board-grid font-body text-text px-[6vw] py-[8vh] flex flex-col">
      <h2 className="font-display font-black uppercase text-[5vw] leading-[0.9] tracking-tight">Sport-specific tools, <span className="text-primary">not just different labels</span></h2>
      <div className="mt-auto flex flex-col">
        <div className="grid grid-cols-[22vw_1fr] items-center py-[2vh] border-t border-line">
          <span className="font-display font-black uppercase text-[3.2vw] text-primary leading-none">Basketball</span>
          <p className="text-[2.2vw]">Shooting zones and quarter-by-quarter rotations</p>
        </div>
        <div className="grid grid-cols-[22vw_1fr] items-center py-[2vh] border-t border-line">
          <span className="font-display font-black uppercase text-[3.2vw] text-orange leading-none">Baseball</span>
          <p className="text-[2.2vw]">Batting order, pitch counts, rest, and bullpen availability</p>
        </div>
        <div className="grid grid-cols-[22vw_1fr] items-center py-[2vh] border-t border-line">
          <span className="font-display font-black uppercase text-[3.2vw] text-green leading-none">Soccer</span>
          <p className="text-[2.2vw]">Formations, possession trends, and set-piece roles</p>
        </div>
        <div className="grid grid-cols-[22vw_1fr] items-center py-[2vh] border-t border-line">
          <span className="font-display font-black uppercase text-[3.2vw] text-violet leading-none">Football</span>
          <p className="text-[2.2vw]">Depth charts, playbook, and timestamped film notes</p>
        </div>
        <div className="grid grid-cols-[22vw_1fr] items-center py-[2vh] border-y border-line">
          <span className="font-display font-black uppercase text-[3.2vw] text-accent leading-none">Hockey</span>
          <p className="text-[2.2vw]">Line combinations, rink shot logging, and ice time</p>
        </div>
      </div>
    </div>
  );
}
