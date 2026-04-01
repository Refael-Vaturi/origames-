<footer style="position: fixed; bottom: 0; left: 0; right: 0; background: linear-gradient(45deg, #6a1b9a, #d5006d); padding: 20px; text-align: center; color: white;">
    <button id="contactBtn">Contact Us</button>
    <button id="guidesBtn">Guides</button>
    <button id="aboutBtn">About</button>
</footer>

<!-- Contact Modal -->
<div id="ContactModal" style="display:none;">
    <div style="background: white; padding: 20px; border-radius: 5px;">
        <h2>Contact Us</h2>
        <form id="contactForm">
            <label for="name">Name:</label>
            <input type="text" id="name" required><br>
            <label for="message">Message:</label><br>
            <textarea id="message" required></textarea><br>
            <button type="submit">Send</button>
        </form>
    </div>
</div>

<!-- Guides Modal -->
<div id="GuidesModal" style="display:none;">
    <div style="background: white; padding: 20px; border-radius: 5px;">
        <h2>Guides</h2>
        <p>Here you can find guides related to Ori Games!</p>
    </div>
</div>

<!-- About Modal -->
<div id="AboutModal" style="display:none;">
    <div style="background: white; padding: 20px; border-radius: 5px;">
        <h2>About</h2>
        <p>Ori Games is a platform for amazing game experiences.</p>
    </div>
</div>

<script>
    document.getElementById('contactBtn').onclick = function() {
        document.getElementById('ContactModal').style.display = 'block';
    }
    document.getElementById('guidesBtn').onclick = function() {
        document.getElementById('GuidesModal').style.display = 'block';
    }
    document.getElementById('aboutBtn').onclick = function() {
        document.getElementById('AboutModal').style.display = 'block';
    }
    document.getElementById('contactForm').onsubmit = function(e) {
        e.preventDefault();
        // Tawk.to integration or message submission logic goes here
        alert('Message Sent');
        document.getElementById('ContactModal').style.display = 'none';
    }
</script>
