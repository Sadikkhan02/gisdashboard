export default function ProfileAvatar({ name = 'User' }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
      {initial}
    </div>
  );
}