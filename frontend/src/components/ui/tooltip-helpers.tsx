export const RichTooltip = ({ title, shortcut, description }: { title: string, shortcut?: string, description: string }) => (
    <div className="flex flex-col gap-0.5 text-left max-w-[200px]">
        <div className="font-semibold text-xs flex items-center gap-2">
            {title}
            {shortcut && <span className="opacity-70 font-normal">({shortcut})</span>}
        </div>
        <div className="text-[10px] opacity-80 leading-tight">{description}</div>
    </div>
);
