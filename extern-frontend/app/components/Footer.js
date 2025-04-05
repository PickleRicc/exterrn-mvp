export default function Footer() {
  return (
    <footer className="bg-[#132f4c] text-white py-4 px-4 mt-8">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm md:text-base">&copy; {new Date().getFullYear()} ZIMMR. All rights reserved.</p>
          </div>
          <div className="flex space-x-4 text-sm">
            <a href="#" className="text-gray-300 hover:text-[#f48fb1] transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-300 hover:text-[#f48fb1] transition-colors">Terms of Service</a>
            <a href="#" className="text-gray-300 hover:text-[#f48fb1] transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
