import type { CharacterProps } from './types'
import { getEyeConfig } from './types'

export function PuppySprite({ state }: CharacterProps): JSX.Element {
  const { pupilOffsetX, pupilRadiusY } = getEyeConfig(state)
  const showEyeHighlight = state !== 'idle'

  return (
    <svg
      viewBox="0 0 100 100"
      className="pet-sprite pet-character-puppy"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="50" cy="55" r="42" fill="white" opacity="0.9" />

      {/* Body */}
      <g className="pet-body" style={{ transformOrigin: '50px 70px' }}>
        <ellipse cx="50" cy="68" rx="26" ry="20" fill="#c4a574" />
        <ellipse cx="50" cy="72" rx="18" ry="12" fill="#e8d5b5" />
      </g>

      {/* Tail */}
      <g className="pet-tail" style={{ transformOrigin: '78px 60px' }}>
        <path
          d="M 75 65 Q 85 55 88 45 Q 90 38 85 42"
          stroke="#c4a574"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* Floppy ears */}
      <g className="pet-ears" style={{ transformOrigin: '50px 35px' }}>
        {/* Left ear */}
        <ellipse cx="28" cy="42" rx="10" ry="16" fill="#8b6914" transform="rotate(-20 28 42)" />
        {/* Right ear */}
        <ellipse cx="72" cy="42" rx="10" ry="16" fill="#8b6914" transform="rotate(20 72 42)" />
      </g>

      {/* Head */}
      <ellipse cx="50" cy="45" rx="24" ry="22" fill="#c4a574" />

      {/* Muzzle */}
      <ellipse cx="50" cy="55" rx="14" ry="10" fill="#e8d5b5" />

      {/* Face */}
      <g className="pet-face">
        {/* Nose */}
        <ellipse cx="50" cy="50" rx="5" ry="4" fill="#2d2d2d" />
        <ellipse cx="49" cy="49" rx="2" ry="1" fill="#4a4a4a" opacity="0.5" />
        {/* Mouth */}
        <path d="M 44 56 Q 50 62 56 56" stroke="#8b6914" strokeWidth="2" fill="none" />
        <line x1="50" y1="54" x2="50" y2="58" stroke="#8b6914" strokeWidth="1.5" />
      </g>

      {/* Eyes */}
      <g className="pet-eyes" style={{ transformOrigin: '50px 40px' }}>
        <ellipse cx="40" cy="40" rx="6" ry="7" fill="white" />
        <ellipse cx={40 + pupilOffsetX} cy="40" rx="4" ry={pupilRadiusY} fill="#2d2d2d" />
        {showEyeHighlight && <circle cx="41" cy="38" r="1.5" fill="white" />}
        <ellipse cx="60" cy="40" rx="6" ry="7" fill="white" />
        <ellipse cx={60 - pupilOffsetX} cy="40" rx="4" ry={pupilRadiusY} fill="#2d2d2d" />
        {showEyeHighlight && <circle cx="61" cy="38" r="1.5" fill="white" />}
      </g>

      {/* Eyebrows for expression */}
      <g className="pet-eyebrows">
        {state === 'error' ? (
          <>
            <line x1="35" y1="32" x2="45" y2="34" stroke="#8b6914" strokeWidth="2" strokeLinecap="round" />
            <line x1="55" y1="34" x2="65" y2="32" stroke="#8b6914" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <line x1="35" y1="33" x2="45" y2="33" stroke="#8b6914" strokeWidth="2" strokeLinecap="round" />
            <line x1="55" y1="33" x2="65" y2="33" stroke="#8b6914" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </g>

      {/* ZZZ for sleeping */}
      <g className="pet-zzz">
        <text x="70" y="20" fontSize="10" fill="#8b6914" fontWeight="bold">z</text>
        <text x="76" y="14" fontSize="8" fill="#8b6914" fontWeight="bold">z</text>
        <text x="81" y="9" fontSize="6" fill="#8b6914" fontWeight="bold">z</text>
      </g>

      {/* Paws */}
      <ellipse cx="35" cy="84" rx="8" ry="5" fill="#c4a574" />
      <ellipse cx="65" cy="84" rx="8" ry="5" fill="#c4a574" />

      {/* Tongue (when happy/completed) */}
      {state === 'completed' && (
        <ellipse cx="50" cy="62" rx="4" ry="6" fill="#ff9999" />
      )}

      {/* State expressions */}
      {state === 'completed' && (
        <g className="pet-expression-completed">
          <text x="18" y="25" fontSize="12" fill="#ffd700">&#10022;</text>
          <text x="78" y="28" fontSize="10" fill="#ffd700">&#10022;</text>
        </g>
      )}
      {state === 'error' && (
        <g className="pet-expression-error">
          <ellipse cx="72" cy="28" rx="3" ry="5" fill="#87ceeb" opacity="0.8" />
        </g>
      )}
    </svg>
  )
}
