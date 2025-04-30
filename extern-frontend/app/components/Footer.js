export default function Footer() {
  return (
    <footer className="bg-[#132f4c] text-white py-4 px-4 mt-8">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0 flex items-center space-x-2">
            <img
              src="/images/ZIMMR_Logo_transparent.png"
              alt="ZIMMR Logo"
              className="h-6 w-auto md:h-7 max-w-[80px] md:max-w-[100px] object-contain drop-shadow-md transition-all duration-300"
              style={{ minWidth: '36px', maxHeight: '1.75rem' }}
              loading="eager"
              decoding="async"
            />
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
