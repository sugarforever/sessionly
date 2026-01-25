import type { CharacterProps } from './types'
import { getEyeConfig } from './types'

export function PiggySprite({ state }: CharacterProps): JSX.Element {
  const { pupilOffsetX, pupilRadiusY } = getEyeConfig(state)
  const showEyeHighlight = state !== 'idle'

  return (
    <svg
      viewBox="0 0 100 100"
      className="pet-sprite pet-character-piggy"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="50" cy="55" r="42" fill="white" opacity="0.9" />

      {/* Body */}
      <g className="pet-body" style={{ transformOrigin: '50px 68px' }}>
        <ellipse cx="50" cy="68" rx="28" ry="22" fill="#ffb6c1" />
        <ellipse cx="50" cy="72" rx="20" ry="14" fill="#ffc8d4" />
      </g>

      {/* Curly tail */}
      <g className="pet-tail" style={{ transformOrigin: '78px 65px' }}>
        <path
          d="M 75 65 Q 82 60 85 65 Q 88 72 82 70 Q 78 68 82 62"
          stroke="#ffb6c1"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* Ears */}
      <g className="pet-ears" style={{ transformOrigin: '50px 30px' }}>
        {/* Left ear */}
        <ellipse cx="32" cy="32" rx="10" ry="12" fill="#ffb6c1" transform="rotate(-15 32 32)" />
        <ellipse cx="32" cy="32" rx="6" ry="8" fill="#ff9eb5" transform="rotate(-15 32 32)" />
        {/* Right ear */}
        <ellipse cx="68" cy="32" rx="10" ry="12" fill="#ffb6c1" transform="rotate(15 68 32)" />
        <ellipse cx="68" cy="32" rx="6" ry="8" fill="#ff9eb5" transform="rotate(15 68 32)" />
      </g>

      {/* Head */}
      <ellipse cx="50" cy="45" rx="26" ry="24" fill="#ffb6c1" />

      {/* Snout */}
      <g className="pet-face">
        <ellipse cx="50" cy="52" rx="14" ry="10" fill="#ff9eb5" />
        {/* Nostrils */}
        <ellipse cx="45" cy="52" rx="3" ry="4" fill="#e8879b" />
        <ellipse cx="55" cy="52" rx="3" ry="4" fill="#e8879b" />
        {/* Mouth */}
        <path d="M 44 60 Q 50 64 56 60" stroke="#e8879b" strokeWidth="2" fill="none" />
      </g>

      {/* Cheeks */}
      <circle cx="30" cy="50" r="6" fill="#ff9eb5" opacity="0.5" />
      <circle cx="70" cy="50" r="6" fill="#ff9eb5" opacity="0.5" />

      {/* Eyes */}
      <g className="pet-eyes" style={{ transformOrigin: '50px 40px' }}>
        <ellipse cx="40" cy="40" rx="5" ry="6" fill="white" />
        <ellipse cx={40 + pupilOffsetX} cy="40" rx="3" ry={pupilRadiusY} fill="#2d2d2d" />
        {showEyeHighlight && <circle cx="41" cy="38" r="1" fill="white" />}
        <ellipse cx="60" cy="40" rx="5" ry="6" fill="white" />
        <ellipse cx={60 - pupilOffsetX} cy="40" rx="3" ry={pupilRadiusY} fill="#2d2d2d" />
        {showEyeHighlight && <circle cx="61" cy="38" r="1" fill="white" />}
      </g>

      {/* ZZZ for sleeping */}
      <g className="pet-zzz">
        <text x="70" y="18" fontSize="10" fill="#e8879b" fontWeight="bold">z</text>
        <text x="76" y="12" fontSize="8" fill="#e8879b" fontWeight="bold">z</text>
        <text x="81" y="7" fontSize="6" fill="#e8879b" fontWeight="bold">z</text>
      </g>

      {/* Legs/hooves */}
      <ellipse cx="35" cy="86" rx="6" ry="4" fill="#ffb6c1" />
      <ellipse cx="65" cy="86" rx="6" ry="4" fill="#ffb6c1" />
      {/* Hoof marks */}
      <line x1="33" y1="86" x2="33" y2="88" stroke="#e8879b" strokeWidth="2" />
      <line x1="37" y1="86" x2="37" y2="88" stroke="#e8879b" strokeWidth="2" />
      <line x1="63" y1="86" x2="63" y2="88" stroke="#e8879b" strokeWidth="2" />
      <line x1="67" y1="86" x2="67" y2="88" stroke="#e8879b" strokeWidth="2" />

      {/* State expressions */}
      {state === 'completed' && (
        <g className="pet-expression-completed">
          <text x="18" y="22" fontSize="12" fill="#ffd700">&#10022;</text>
          <text x="78" y="25" fontSize="10" fill="#ffd700">&#10022;</text>
        </g>
      )}
      {state === 'error' && (
        <g className="pet-expression-error">
          <ellipse cx="75" cy="28" rx="3" ry="5" fill="#87ceeb" opacity="0.8" />
        </g>
      )}
    </svg>
  )
}
