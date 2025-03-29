export default function Footer() {
  return (
    <footer className="bg-gray-100 p-4 mt-8">
      <div className="container mx-auto text-center">
        <p>© {new Date().getFullYear()} Extern. All rights reserved.</p>
      </div>
    </footer>
  );
}
