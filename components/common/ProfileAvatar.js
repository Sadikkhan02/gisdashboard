export default function ProfileAvatar({ name = 'User' }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#123c35] font-semibold text-white">
      {initial}
    </div>
  );
}
