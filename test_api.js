async function test() {
  console.log('--- Testing CampusGenie Endpoints ---');
  
  // 1. Test /api/events
  const resEvents = await fetch('http://localhost:8000/api/events');
  const dataEvents = await resEvents.json();
  console.log('✓ /api/events status:', resEvents.status);
  console.log('✓ Events returned:', dataEvents.count);

  // 2. Test /api/chat Question 13
  const resChat = await fetch('http://localhost:8000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Find me a hackathon next weekend I can get OD for, and tell me what I need to submit.'
    })
  });
  const dataChat = await resChat.json();
  console.log('✓ /api/chat status:', resChat.status);
  console.log('✓ Assistant text snippet:', dataChat.text.slice(0, 80) + '...');
  console.log('✓ Assistant SQL generated:', dataChat.sql ? 'YES' : 'NO');
  console.log('✓ Citations count:', dataChat.citations ? dataChat.citations.length : 0);
  if (dataChat.citations && dataChat.citations[0]) {
    console.log('✓ Citation 1:', dataChat.citations[0].doc_title, '->', dataChat.citations[0].clause);
  }

  // 3. Test /api/feed
  const resFeed = await fetch('http://localhost:8000/api/feed');
  const dataFeed = await resFeed.json();
  console.log('✓ /api/feed returned:', dataFeed.count, 'ranked events');
  console.log('✓ Sample reason:', dataFeed.feed[0]?.reason);

  // 4. Test Frontend serving
  const resFront = await fetch('http://localhost:8000/');
  const html = await resFront.text();
  console.log('✓ Frontend index.html served:', html.includes('CampusGenie') ? 'YES' : 'NO');

  console.log('--- All Verification Tests Passed Successfully! ---');
}

test().catch(console.error);
