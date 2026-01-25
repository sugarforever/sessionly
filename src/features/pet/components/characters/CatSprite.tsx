import type { CharacterProps } from './types'
import { getEyeConfig } from './types'

export function CatSprite({ state }: CharacterProps): JSX.Element {
  const { pupilOffsetX, pupilRadiusY } = getEyeConfig(state)
  const showEyeHighlight = state !== 'idle'

  return (
    <svg
      viewBox="0 0 100 100"
      className="pet-sprite pet-character-cat"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle for better visibility */}
      <circle cx="50" cy="55" r="42" fill="white" opacity="0.9" />

      {/* Body */}
      <g className="pet-body" style={{ transformOrigin: '50px 70px' }}>
        <ellipse cx="50" cy="65" rx="28" ry="22" fill="#4a4a4a" />
        <ellipse cx="50" cy="68" rx="18" ry="14" fill="#6b6b6b" />
      </g>

      {/* Tail */}
      <g className="pet-tail" style={{ transformOrigin: '25px 65px' }}>
        <path
          d="M 25 65 Q 10 55 8 40 Q 6 30 15 35"
          stroke="#4a4a4a"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* Ears */}
      <g className="pet-ears" style={{ transformOrigin: '50px 30px' }}>
        <polygon points="30,35 38,15 46,35" fill="#4a4a4a" />
        <polygon points="33,33 38,20 43,33" fill="#ffb6c1" />
        <polygon points="54,35 62,15 70,35" fill="#4a4a4a" />
        <polygon points="57,33 62,20 67,33" fill="#ffb6c1" />
      </g>

      {/* Head */}
      <ellipse cx="50" cy="42" rx="24" ry="20" fill="#4a4a4a" />

      {/* Face */}
      <g className="pet-face">
        <ellipse cx="50" cy="50" rx="12" ry="8" fill="#6b6b6b" />
        <ellipse cx="50" cy="47" rx="4" ry="3" fill="#ffb6c1" />
        <path d="M 46 52 Q 50 55 54 52" stroke="#4a4a4a" strokeWidth="1.5" fill="none" />
      </g>

      {/* Eyes */}
      <g className="pet-eyes" style={{ transformOrigin: '50px 38px' }}>
        <ellipse cx="40" cy="38" rx="5" ry="6" fill="white" />
        <ellipse cx={40 + pupilOffsetX} cy="38" rx="3" ry={pupilRadiusY} fill="#2d2d2d" />
        {showEyeHighlight && <circle cx="41" cy="36" r="1" fill="white" />}
        <ellipse cx="60" cy="38" rx="5" ry="6" fill="white" />
        <ellipse cx={60 - pupilOffsetX} cy="38" rx="3" ry={pupilRadiusY} fill="#2d2d2d" />
        {showEyeHighlight && <circle cx="61" cy="36" r="1" fill="white" />}
      </g>

      {/* Whiskers */}
      <g className="pet-whiskers" style={{ transformOrigin: '50px 50px' }}>
        <line x1="38" y1="48" x2="20" y2="45" stroke="#4a4a4a" strokeWidth="1" />
        <line x1="38" y1="50" x2="20" y2="50" stroke="#4a4a4a" strokeWidth="1" />
        <line x1="38" y1="52" x2="20" y2="55" stroke="#4a4a4a" strokeWidth="1" />
        <line x1="62" y1="48" x2="80" y2="45" stroke="#4a4a4a" strokeWidth="1" />
        <line x1="62" y1="50" x2="80" y2="50" stroke="#4a4a4a" strokeWidth="1" />
        <line x1="62" y1="52" x2="80" y2="55" stroke="#4a4a4a" strokeWidth="1" />
      </g>

      {/* ZZZ for sleeping */}
      <g className="pet-zzz">
        <text x="70" y="20" fontSize="10" fill="#4a4a4a" fontWeight="bold">z</text>
        <text x="76" y="14" fontSize="8" fill="#4a4a4a" fontWeight="bold">z</text>
        <text x="81" y="9" fontSize="6" fill="#4a4a4a" fontWeight="bold">z</text>
      </g>

      {/* Paws */}
      <ellipse cx="35" cy="82" rx="6" ry="4" fill="#4a4a4a" />
      <ellipse cx="65" cy="82" rx="6" ry="4" fill="#4a4a4a" />

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
