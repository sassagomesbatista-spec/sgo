export default function Icon({ name }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (name) {
    case 'home':
      return (
        <svg {...props}>
          <path d="M3 10.5L10 4l7 6.5" />
          <path d="M5 9v8a1 1 0 001 1h3v-5h2v5h3a1 1 0 001-1V9" />
        </svg>
      );
    case 'plus-circle':
      return (
        <svg {...props}>
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 6.5v7M6.5 10h7" />
        </svg>
      );
    case 'list':
      return (
        <svg {...props}>
          <path d="M4 5.5h12M4 10h12M4 14.5h12" />
        </svg>
      );
    case 'users':
      return (
        <svg {...props}>
          <circle cx="7" cy="7" r="3" />
          <path d="M2 17c0-3 2-5 5-5s5 2 5 5" />
          <circle cx="15" cy="8" r="2.2" />
          <path d="M13.2 12c2 .3 3.3 2 3.8 5" />
        </svg>
      );
    case 'user':
      return (
        <svg {...props}>
          <circle cx="10" cy="6.5" r="3.2" />
          <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        </svg>
      );
    case 'tag':
      return (
        <svg {...props}>
          <path d="M10 3h5a2 2 0 012 2v5l-8 8-7-7 8-8z" />
          <circle cx="13.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'scissors':
      return (
        <svg {...props}>
          <circle cx="6" cy="6" r="2.2" />
          <circle cx="6" cy="14" r="2.2" />
          <path d="M7.7 7.5L17 16M17 4L7.7 12.5" />
        </svg>
      );
    case 'dollar':
      return (
        <svg {...props}>
          <path d="M10 2v16" />
          <path d="M13.5 5.5c0-1.4-1.6-2.5-3.5-2.5S6.5 4 6.5 5.5 8 8 10 8s3.5 1.1 3.5 2.7-1.6 2.8-3.5 2.8-3.5-1-3.5-2.5" />
        </svg>
      );
    case 'file':
      return (
        <svg {...props}>
          <path d="M6 2h5l4 4v12a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" />
          <path d="M8 10.5h4M8 13.5h4" />
        </svg>
      );
    case 'account':
      return (
        <svg {...props}>
          <circle cx="10" cy="10" r="7.5" />
          <circle cx="10" cy="8" r="2.4" />
          <path d="M5.3 15.7c.9-2.3 2.7-3.6 4.7-3.6s3.8 1.3 4.7 3.6" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...props}>
          <path d="M8 4H4a1 1 0 00-1 1v10a1 1 0 001 1h4" />
          <path d="M13 14l4-4-4-4M17 10H7" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...props}>
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 5.5V10l3 2" />
        </svg>
      );
    default:
      return null;
  }
}
