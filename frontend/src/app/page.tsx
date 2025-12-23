export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center space-y-8">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900">
            Never Miss Another
            <span className="block text-blue-600">Customer Call</span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            AI voice agents that answer phones, book appointments, and handle customer service 24/7.
            Starting at $50/month with usage-based pricing.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/signup"
              className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Free Trial
            </a>
            <a
              href="#how-it-works"
              className="px-8 py-4 bg-white text-gray-900 font-semibold rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-colors"
            >
              See How It Works
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div id="how-it-works" className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Answer Every Call</h3>
            <p className="text-gray-600">
              Never miss a customer again. Your AI agent answers immediately, 24/7, even when you're busy.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Book Appointments</h3>
            <p className="text-gray-600">
              Automatically schedule appointments, check availability, and send confirmations without lifting a finger.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Usage-Based Pricing</h3>
            <p className="text-gray-600">
              Pay only for what you use. Automatic tier adjustment means you never overpay or hit limits.
            </p>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-24 text-center">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-8">
            Trusted by businesses in
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-gray-400">
            <span>Restaurants</span>
            <span>Dental Offices</span>
            <span>HVAC Companies</span>
            <span>Salons</span>
            <span>Auto Repair</span>
            <span>Real Estate</span>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mt-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Fair Pricing</h2>
            <p className="text-xl text-gray-600">Pay for what you use. Scale automatically.</p>
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Usage-Based</h3>
                  <p className="text-gray-600 mb-6">Automatic tier adjustment based on your call volume</p>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-700">0-50 calls/month</span>
                      <span className="font-semibold text-gray-900">$2.00/call</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-700">51-150 calls/month</span>
                      <span className="font-semibold text-gray-900">$1.50/call</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-700">151-300 calls/month</span>
                      <span className="font-semibold text-gray-900">$1.25/call</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-700">301+ calls/month</span>
                      <span className="font-semibold text-gray-900">$1.00/call</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-xl">
                  <div className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">Platform Fee</div>
                  <div className="text-4xl font-bold text-gray-900 mb-2">$50<span className="text-xl font-normal text-gray-600">/month</span></div>
                  <p className="text-gray-600 mb-6">Includes everything you need to get started</p>
                  
                  <ul className="space-y-3">
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Dedicated phone number
                    </li>
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Call recordings & transcripts
                    </li>
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Calendar integration
                    </li>
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Email support
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 text-center">
                <a
                  href="/signup"
                  className="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start 30-Day Free Trial
                </a>
                <p className="mt-4 text-sm text-gray-500">No credit card required</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 bg-blue-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Stop Missing Calls?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join hundreds of businesses using AI to handle their phone calls
          </p>
          <a
            href="/signup"
            className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Get Started Free
          </a>
        </div>
      </div>
    </main>
  );
}
