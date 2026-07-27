/**
 * The premium glass container every Sage Vault icon sits inside.
 * 48x48 / 14px radius / soft glass, with a 180ms lift on hover.
 */

import { Icon, ICON_SIZE, type IconName } from "./icon";
import type { IconTone } from "./icon-gradients";

export type IconTileProps = {
  name: IconName;
  /** Tile edge in px. The glyph scales to ~50% of it. */
  size?: number;
  tone?: IconTone;
  /** Enable the hover lift. Off for purely decorative tiles. */
  interactive?: boolean;
  /** Adds a 1-2 degree tilt on hover — for action icons. */
  tilt?: boolean;
  className?: string;
  title?: string;
};

export function IconTile({
  name,
  size = 48,
  tone,
  interactive = true,
  tilt = false,
  className,
  title,
}: IconTileProps) {
  const glyphSize = size >= 48 ? ICON_SIZE.card : Math.round(size * 0.5);

  return (
    <span
      className={[
        "sv-tile",
        interactive && "sv-tile--interactive",
        tilt && "sv-tile--tilt",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.29) }}
    >
      <Icon name={name} size={glyphSize} tone={tone} title={title} />
    </span>
  );
}
