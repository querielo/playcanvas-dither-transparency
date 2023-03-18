import { DitherTransparency } from "../dither-transparency";

export class AnimateDitherTransparency extends pc.ScriptType {
    public update(dt: number) {
        // @ts-ignore
        const ditherTransparency =this.entity.script?.ditherTransparency as DitherTransparency | undefined;

        if (!ditherTransparency) {
            return;
        }

        ditherTransparency.transparency = Math.abs(Math.sin(Date.now() / 1000));
    }
}
pc.registerScript(AnimateDitherTransparency, 'animateDitherTransparency');
