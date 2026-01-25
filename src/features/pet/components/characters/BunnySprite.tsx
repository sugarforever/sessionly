import type { CharacterProps } from './types'
import { getEyeConfig } from './types'

export function BunnySprite({ state }: CharacterProps): JSX.Element {
  const { pupilOffsetX, pupilRadiusY } = getEyeConfig(state)
  const showEyeHighlight = state !== 'idle'

  return (
    <svg
      viewBox="0 0 100 100"
      className="pet-sprite pet-character-bunny"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="50" cy="55" r="42" fill="white" opacity="0.9" />

      {/* Body */}
      <g className="pet-body" style={{ transformOrigin: '50px 70px' }}>
        <ellipse cx="50" cy="68" rx="24" ry="20" fill="#e8dcd0" />
        <ellipse cx="50" cy="72" rx="16" ry="12" fill="#f5efe8" />
      </g>

      {/* Fluffy tail */}
      <g className="pet-tail" style={{ transformOrigin: '75px 70px' }}>
        <circle cx="75" cy="70" r="8" fill="#f5efe8" />
        <circle cx="77" cy="68" r="4" fill="#fff" opacity="0.5" />
      </g>

      {/* Long ears */}
      <g className="pet-ears" style={{ transformOrigin: '50px 20px' }}>
        {/* Left ear */}
        <ellipse cx="38" cy="18" rx="8" ry="22" fill="#e8dcd0" />
        <ellipse cx="38" cy="18" rx="5" ry="18" fill="#ffb6c1" />
        {/* Right ear */}
        <ellipse cx="62" cy="18" rx="8" ry="22" fill="#e8dcd0" />
        <ellipse cx="62" cy="18" rx="5" ry="18" fill="#ffb6c1" />
      </g>

      {/* Head */}
      <ellipse cx="50" cy="48" rx="22" ry="20" fill="#e8dcd0" />

      {/* Cheeks */}
      <circle cx="32" cy="52" r="6" fill="#ffcdd2" opacity="0.5" />
      <circle cx="68" cy="52" r="6" fill="#ffcdd2" opacity="0.5" />

      {/* Face */}
      <g className="pet-face">
        {/* Nose */}
        <ellipse cx="50" cy="52" rx="4" ry="3" fill="#ffb6c1" />
        {/* Mouth */}
        <path d="M 47 56 Q 50 59 53 56" stroke="#c9a68c" strokeWidth="1.5" fill="none" />
        <line x1="50" y1="55" x2="50" y2="58" stroke="#c9a68c" strokeWidth="1" />
      </g>

      {/* Eyes */}
      <g className="pet-eyes" style={{ transformOrigin: '50px 44px' }}>
        <ellipse cx="40" cy="44" rx="5" ry="6" fill="white" />
        <ellipse cx={40 + pupilOffsetX} cy="44" rx="3" ry={pupilRadiusY} fill="#4a3728" />
        {showEyeHighlight && <circle cx="41" cy="42" r="1.5" fill="white" />}
        <ellipse cx="60" cy="44" rx="5" ry="6" fill="white" />
        <ellipse cx={60 - pupilOffsetX} cy="44" rx="3" ry={pupilRadiusY} fill="#4a3728" />
        {showEyeHighlight && <circle cx="61" cy="42" r="1.5" fill="white" />}
      </g>

      {/* Whiskers */}
      <g className="pet-whiskers" style={{ transformOrigin: '50px 52px' }}>
        <line x1="38" y1="50" x2="22" y2="48" stroke="#c9a68c" strokeWidth="1" />
        <line x1="38" y1="52" x2="22" y2="52" stroke="#c9a68c" strokeWidth="1" />
        <line x1="38" y1="54" x2="22" y2="56" stroke="#c9a68c" strokeWidth="1" />
        <line x1="62" y1="50" x2="78" y2="48" stroke="#c9a68c" strokeWidth="1" />
        <line x1="62" y1="52" x2="78" y2="52" stroke="#c9a68c" strokeWidth="1" />
        <line x1="62" y1="54" x2="78" y2="56" stroke="#c9a68c" strokeWidth="1" />
      </g>

      {/* ZZZ for sleeping */}
      <g className="pet-zzz">
        <text x="70" y="20" fontSize="10" fill="#c9a68c" fontWeight="bold">z</text>
        <text x="76" y="14" fontSize="8" fill="#c9a68c" fontWeight="bold">z</text>
        <text x="81" y="9" fontSize="6" fill="#c9a68c" fontWeight="bold">z</text>
      </g>

      {/* Paws */}
      <ellipse cx="35" cy="84" rx="7" ry="4" fill="#e8dcd0" />
      <ellipse cx="65" cy="84" rx="7" ry="4" fill="#e8dcd0" />

      {/* State expressions */}
      {state === 'completed' && (
        <g className="pet-expression-completed">
          <text x="18" y="25" fontSize="12" fill="#ffd700">&#10022;</text>
          <text x="78" y="28" fontSize="10" fill="#ffd700">&#10022;</text>
        </g>
      )}
      {state === 'error' && (
        <g className="pet-expression-error">
          <ellipse cx="72" cy="30" rx="3" ry="5" fill="#87ceeb" opacity="0.8" />
        </g>
      )}
    </svg>
  )
}
