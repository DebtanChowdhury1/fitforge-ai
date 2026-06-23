import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, StyleSheet, Dimensions, FlatList, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search, X, Dumbbell, Zap, Target, Flame, Activity,
  TrendingUp, Shield, ChevronRight, RotateCcw,
  Timer, Repeat, Info,
} from 'lucide-react-native';
import { FadeIn } from '../../components/FadeIn';
import { ExerciseAnimationView } from '../../components/ExerciseAnimationView';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 20 * 2 - 10) / 2;
const CARD_H = 200;

// ── Data ──────────────────────────────────────────────────────────────────────

interface Exercise {
  name: string;
  category: string;
  equipment: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  sets: string;
  reps: string;
  rest: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  description: string;
  cues: string[];
  tip?: string;
}

const EXERCISES: Exercise[] = [
  // ── Chest ──
  { name: 'Barbell Bench Press', category: 'chest', equipment: 'Barbell', difficulty: 'Intermediate', sets: '4', reps: '6-10', rest: '2 min', primaryMuscles: ['Pectorals'], secondaryMuscles: ['Triceps', 'Front Delts'], description: 'The king of chest exercises. Builds overall mass and pressing strength across the full pec span.', cues: ['Retract shoulder blades', 'Bar touches lower chest', 'Drive feet into floor', 'Press in slight arc'], tip: 'A slight arch in your lower back is natural and safe — just keep your glutes on the bench.' },
  { name: 'Incline Dumbbell Press', category: 'chest', equipment: 'Dumbbells', difficulty: 'Beginner', sets: '3', reps: '10-12', rest: '90s', primaryMuscles: ['Upper Pectorals'], secondaryMuscles: ['Triceps', 'Front Delts'], description: 'Targets the upper chest where most people are weakest. 30-45° incline for best activation.', cues: ['30-45° bench angle', 'Elbows at 45°', 'Full stretch at bottom', 'Squeeze at top'], tip: 'Going too steep (above 60°) turns this into a shoulder press — keep the incline moderate.' },
  { name: 'Cable Fly', category: 'chest', equipment: 'Cable', difficulty: 'Beginner', sets: '3', reps: '12-15', rest: '60s', primaryMuscles: ['Pectorals'], secondaryMuscles: ['Biceps'], description: 'Isolation movement with constant tension throughout. Superior stretch compared to dumbbell fly.', cues: ['Slight elbow bend', 'Hug a tree arc', 'Squeeze at midline', 'Control the stretch'], tip: 'Set cables at chest height for mid-pec focus, above for lower, below for upper.' },
  { name: 'Push-Up', category: 'chest', equipment: 'Bodyweight', difficulty: 'Beginner', sets: '3', reps: '15-20', rest: '60s', primaryMuscles: ['Pectorals'], secondaryMuscles: ['Triceps', 'Core'], description: 'Fundamental pressing movement that needs no equipment. Scales easily with elevation variations.', cues: ['Straight body line', 'Touch chest to floor', 'Elbows 45°', 'Full lockout at top'], tip: 'Elevate feet for upper chest focus; elevate hands for a lower-chest stretch.' },
  { name: 'Decline Bench Press', category: 'chest', equipment: 'Barbell', difficulty: 'Intermediate', sets: '3', reps: '8-12', rest: '90s', primaryMuscles: ['Lower Pectorals'], secondaryMuscles: ['Triceps'], description: 'Targets lower chest. Most people are strongest at this angle — great for loading heavy.', cues: ['Hook feet securely', 'Wider grip than flat', 'Control descent', 'Explode up'], tip: 'Keep the range full — many people cut reps short here which defeats the purpose.' },
  { name: 'Chest Dip', category: 'chest', equipment: 'Bodyweight', difficulty: 'Intermediate', sets: '3', reps: '8-12', rest: '90s', primaryMuscles: ['Lower Pectorals'], secondaryMuscles: ['Triceps', 'Front Delts'], description: 'Excellent chest builder when leaning forward. Can be loaded with a belt for serious progression.', cues: ['Lean forward 30°', 'Go below parallel', 'Control descent', 'Elbows flared slightly'], tip: 'More forward lean = more chest. Upright = more triceps. Pick your target.' },
  // ── Back ──
  { name: 'Deadlift', category: 'back', equipment: 'Barbell', difficulty: 'Advanced', sets: '3', reps: '3-5', rest: '3 min', primaryMuscles: ['Spinal Erectors', 'Glutes'], secondaryMuscles: ['Hamstrings', 'Lats', 'Traps'], description: 'The most complete strength exercise. Trains the entire posterior chain from neck to heels.', cues: ['Neutral spine', 'Bar over mid-foot', 'Lat engagement', 'Push floor away'], tip: 'Think "push the floor away" rather than "pull the bar up" — it keeps your back flatter.' },
  { name: 'Pull-Up', category: 'back', equipment: 'Bodyweight', difficulty: 'Intermediate', sets: '4', reps: '6-10', rest: '90s', primaryMuscles: ['Lats'], secondaryMuscles: ['Biceps', 'Rear Delts'], description: 'Best bodyweight lat exercise. Wide grip for lats; close grip shifts load to biceps.', cues: ['Dead hang start', 'Pull elbows to hips', 'Full ROM', 'Avoid swinging'], tip: 'If you can\'t do one rep yet, negatives (jump to top, lower slowly for 5s) build strength fast.' },
  { name: 'Barbell Row', category: 'back', equipment: 'Barbell', difficulty: 'Intermediate', sets: '4', reps: '6-10', rest: '2 min', primaryMuscles: ['Lats', 'Mid Traps'], secondaryMuscles: ['Biceps', 'Rear Delts'], description: 'Heavy compound row for overall back thickness and strength. One of the best mass builders.', cues: ['Hinge at hips', 'Bar to lower chest', 'Elbows close to body', 'Squeeze shoulder blades'], tip: 'A slight body-English on max sets is OK — avoid turning it into a full-body swing.' },
  { name: 'Dumbbell Row', category: 'back', equipment: 'Dumbbells', difficulty: 'Beginner', sets: '3', reps: '10-12', rest: '60s', primaryMuscles: ['Lats'], secondaryMuscles: ['Biceps', 'Rear Delts'], description: 'Single-arm row allows heavier loads than most think and provides better stretch at the bottom.', cues: ['Brace on bench', 'Elbow close to torso', 'Full stretch down', 'Row to hip not armpit'], tip: 'Reaching the dumbbell toward the floor at the bottom (elbow fully extended) doubles the lat stretch.' },
  { name: 'Lat Pulldown', category: 'back', equipment: 'Cable', difficulty: 'Beginner', sets: '4', reps: '10-12', rest: '75s', primaryMuscles: ['Lats'], secondaryMuscles: ['Biceps', 'Mid Back'], description: 'Great lat isolation and perfect for building pull-up strength progressively.', cues: ['Slight lean back', 'Pull to upper chest', 'Elbows drive down', 'Squeeze lats at bottom'], tip: 'Overhand grip hits lats harder; underhand hits biceps more — match to your goal.' },
  { name: 'Face Pull', category: 'back', equipment: 'Cable', difficulty: 'Beginner', sets: '3', reps: '15-20', rest: '60s', primaryMuscles: ['Rear Delts'], secondaryMuscles: ['External Rotators', 'Mid Traps'], description: 'Essential for shoulder health and posture. One of the most underrated movements in any program.', cues: ['Pull to nose level', 'External rotate at end', 'Elbows high', 'Squeeze rear delts'], tip: 'Do these every session. They counteract all the pressing and protect your rotator cuffs.' },
  // ── Legs ──
  { name: 'Barbell Back Squat', category: 'legs', equipment: 'Barbell', difficulty: 'Intermediate', sets: '4', reps: '5-8', rest: '2-3 min', primaryMuscles: ['Quads'], secondaryMuscles: ['Glutes', 'Hamstrings', 'Core'], description: 'The foundational lower body exercise. Builds maximum leg mass and overall strength.', cues: ['Feet shoulder-width', 'Keep chest up', 'Drive through heels', 'Break parallel'], tip: 'Depth matters. Half squats build half a quad. Break parallel every rep.' },
  { name: 'Romanian Deadlift', category: 'legs', equipment: 'Barbell', difficulty: 'Intermediate', sets: '3', reps: '10-12', rest: '90s', primaryMuscles: ['Hamstrings'], secondaryMuscles: ['Glutes', 'Spinal Erectors'], description: 'Best hamstring stretch and strength exercise. Hip hinge movement with loaded eccentric.', cues: ['Soft knee bend', 'Push hips back', 'Feel hamstring stretch', 'Maintain flat back'], tip: 'Feel the hamstring stretch before reversing — that\'s the whole point of the movement.' },
  { name: 'Bulgarian Split Squat', category: 'legs', equipment: 'Dumbbells', difficulty: 'Advanced', sets: '3', reps: '8-10', rest: '90s', primaryMuscles: ['Quads', 'Glutes'], secondaryMuscles: ['Hamstrings', 'Hip Flexors'], description: 'Single-leg squat variation that fixes imbalances and builds deep quad and glute mass.', cues: ['Back foot elevated', 'Front knee over toe', 'Torso upright', 'Full depth'], tip: 'The closer your front foot, the more glute-dominant; further out = more quad.' },
  { name: 'Leg Press', category: 'legs', equipment: 'Machine', difficulty: 'Beginner', sets: '4', reps: '10-15', rest: '90s', primaryMuscles: ['Quads'], secondaryMuscles: ['Glutes', 'Hamstrings'], description: 'High-volume quad builder. Lets you train legs to failure safely without spotters.', cues: ['Feet hip-width', "Don't lock knees fully", 'Full depth', 'Control the descent'], tip: 'High foot placement shifts load to glutes/hamstrings; low placement hits quads harder.' },
  { name: 'Leg Curl', category: 'legs', equipment: 'Machine', difficulty: 'Beginner', sets: '3', reps: '12-15', rest: '60s', primaryMuscles: ['Hamstrings'], secondaryMuscles: ['Calves'], description: 'Hamstring isolation. Seated version gives more stretch; lying version gives more peak contraction.', cues: ['Hips stay down', 'Full curl to 90°', 'Slow eccentric', "Don't use momentum"], tip: 'A 3-second lowering phase doubles the muscle damage — do NOT rush the eccentric.' },
  { name: 'Calf Raise', category: 'legs', equipment: 'Machine', difficulty: 'Beginner', sets: '4', reps: '15-20', rest: '45s', primaryMuscles: ['Gastrocnemius', 'Soleus'], secondaryMuscles: [], description: 'Calves respond to high volume and full range. Most people use too much weight and too little ROM.', cues: ['Full stretch at bottom', 'Pause at top', "Don't bounce", 'Toes straight'], tip: 'Pause 1 second at the bottom stretch. Bouncing defeats 50% of the muscle stimulus.' },
  // ── Shoulders ──
  { name: 'Overhead Press', category: 'shoulders', equipment: 'Barbell', difficulty: 'Intermediate', sets: '4', reps: '6-10', rest: '2 min', primaryMuscles: ['Front Delts', 'Side Delts'], secondaryMuscles: ['Triceps', 'Upper Traps', 'Core'], description: 'The fundamental upper body push. Builds shoulder mass, stability, and full pressing strength.', cues: ['Bar on upper chest', 'Press straight up', 'Lock out overhead', 'Squeeze glutes'], tip: 'Your ears should pass in front of your biceps at lockout — if not, you\'re pressing forward.' },
  { name: 'Lateral Raise', category: 'shoulders', equipment: 'Dumbbells', difficulty: 'Beginner', sets: '4', reps: '15-20', rest: '60s', primaryMuscles: ['Side Delts'], secondaryMuscles: ['Traps'], description: 'Best side delt isolation. The movement that makes shoulders visually wider.', cues: ['Slight forward lean', 'Lead with elbows', 'Stop at shoulder level', 'No momentum'], tip: 'Pinkie slightly higher than thumb at the top — like pouring a bottle — maximizes side delt hit.' },
  { name: 'Arnold Press', category: 'shoulders', equipment: 'Dumbbells', difficulty: 'Intermediate', sets: '3', reps: '10-12', rest: '75s', primaryMuscles: ['All Three Delt Heads'], secondaryMuscles: ['Triceps'], description: 'Rotational press hits all three delt heads in one movement. Named after Schwarzenegger himself.', cues: ['Start with palms in', 'Rotate as you press', 'Full overhead lockout', 'Reverse on way down'], tip: 'Go light to start — the rotation makes this harder than it looks on paper.' },
  { name: 'Rear Delt Fly', category: 'shoulders', equipment: 'Dumbbells', difficulty: 'Beginner', sets: '3', reps: '15-20', rest: '60s', primaryMuscles: ['Rear Delts'], secondaryMuscles: ['Mid Traps'], description: 'Targets often-neglected rear delts. Critical for balanced shoulder development and posture.', cues: ['Hinge forward at hips', 'Slight elbow bend', 'Lead with elbows', 'Squeeze at top'], tip: 'Most people use too much weight here. Drop the ego — feel the rear delt working.' },
  // ── Arms ──
  { name: 'Barbell Curl', category: 'arms', equipment: 'Barbell', difficulty: 'Beginner', sets: '3', reps: '10-12', rest: '60s', primaryMuscles: ['Biceps'], secondaryMuscles: ['Brachialis'], description: 'Classic bicep builder. Allows the heaviest load for direct bicep isolation work.', cues: ['Elbows pinned', 'Supinate at top', 'Full extension', '2s eccentric'], tip: 'Letting your elbows drift forward at the top cheats the range. Keep them pinned.' },
  { name: 'Hammer Curl', category: 'arms', equipment: 'Dumbbells', difficulty: 'Beginner', sets: '3', reps: '10-12', rest: '60s', primaryMuscles: ['Brachialis', 'Brachioradialis'], secondaryMuscles: ['Biceps'], description: 'Neutral grip targets the brachialis — the muscle that pushes the bicep up from below.', cues: ['Neutral grip throughout', 'Elbows stay back', 'Alternate or together', 'Control down'], tip: 'This builds arm thickness more than peak. Pair it with supinated curls for both dimensions.' },
  { name: 'Skull Crusher', category: 'arms', equipment: 'Barbell', difficulty: 'Intermediate', sets: '3', reps: '10-12', rest: '75s', primaryMuscles: ['Triceps Long Head'], secondaryMuscles: ['Triceps Lateral Head'], description: 'Elite tricep isolation. Stretches the long head maximally — which makes up the majority of tricep mass.', cues: ['Lower to forehead', 'Elbows stay stationary', 'Extend fully', 'Slow eccentric'], tip: 'Keep your elbows from flaring — the moment they flare, tension moves away from the tricep.' },
  { name: 'Cable Pushdown', category: 'arms', equipment: 'Cable', difficulty: 'Beginner', sets: '3', reps: '12-15', rest: '60s', primaryMuscles: ['Triceps Lateral Head'], secondaryMuscles: [], description: 'Great finisher for triceps. Rope attachment allows for better peak contraction at the bottom.', cues: ['Elbows at sides', 'Push to full extension', 'Flare wrists at bottom', 'Control return'], tip: 'Split the rope apart at the bottom for a hard squeeze — the flare locks the lateral head.' },
  { name: 'Overhead Tricep Extension', category: 'arms', equipment: 'Dumbbells', difficulty: 'Beginner', sets: '3', reps: '12-15', rest: '60s', primaryMuscles: ['Triceps Long Head'], secondaryMuscles: [], description: 'Overhead position places the long head in full stretch — the most effective position for growth.', cues: ['Keep elbows narrow', 'Lower behind head', 'Full extension up', "Don't flare elbows"], tip: 'The long head crosses the shoulder joint — only overhead exercises put it in full stretch.' },
  // ── Core ──
  { name: 'Plank', category: 'core', equipment: 'Bodyweight', difficulty: 'Beginner', sets: '3', reps: '45-60s', rest: '45s', primaryMuscles: ['Transverse Abdominis'], secondaryMuscles: ['Rectus Abdominis', 'Glutes', 'Shoulders'], description: 'Foundation of core stability. Master this before attempting advanced anti-extension work.', cues: ['Neutral spine', 'Squeeze glutes', 'Push elbows into floor', 'Breathe steadily'], tip: 'If you can hold 90 seconds easily, add weight on your back — time-based endurance has limits.' },
  { name: 'Ab Wheel Rollout', category: 'core', equipment: 'Ab Wheel', difficulty: 'Advanced', sets: '3', reps: '8-12', rest: '60s', primaryMuscles: ['Rectus Abdominis'], secondaryMuscles: ['Lats', 'Hip Flexors'], description: 'One of the hardest anti-extension core exercises. Builds deep spinal stability and lat strength simultaneously.', cues: ['Hollow body start', 'Arms extend fully', 'Pull with lats', 'No hip drop'], tip: 'Start from knees until you can do 15 clean reps — then progress to standing.' },
  { name: 'Hanging Leg Raise', category: 'core', equipment: 'Bodyweight', difficulty: 'Advanced', sets: '3', reps: '10-15', rest: '60s', primaryMuscles: ['Hip Flexors', 'Rectus Abdominis'], secondaryMuscles: ['Lats', 'Grip'], description: 'Full lower abs and hip flexor challenge in one movement. Demanding on grip too.', cues: ['Dead hang start', 'Posterior pelvic tilt', 'Raise legs to 90°', 'Lower slowly'], tip: 'Tilt your pelvis posteriorly before lifting — this is what makes it an ab exercise vs hip flexor.' },
  { name: 'Dead Bug', category: 'core', equipment: 'Bodyweight', difficulty: 'Beginner', sets: '3', reps: '10 each side', rest: '45s', primaryMuscles: ['Transverse Abdominis'], secondaryMuscles: ['Multifidus'], description: 'Safe, effective anti-extension core work. Especially good for lower back health and rehab.', cues: ['Lower back flat', 'Breathe out on extension', 'Opposite arm and leg', 'Slow and controlled'], tip: 'If your lower back arches off the floor at any point, shorten the range until you build strength.' },
  // ── Glutes ──
  { name: 'Hip Thrust', category: 'glutes', equipment: 'Barbell', difficulty: 'Intermediate', sets: '4', reps: '10-15', rest: '90s', primaryMuscles: ['Glutes'], secondaryMuscles: ['Hamstrings', 'Quads'], description: 'Highest glute activation of any exercise per EMG research. The premier glute mass builder.', cues: ['Shoulders on bench', 'Drive through heels', 'Full extension', 'Squeeze at top'], tip: 'Chin to chest throughout — keeping your neck neutral prevents overextension at the top.' },
  { name: 'Glute Bridge', category: 'glutes', equipment: 'Bodyweight', difficulty: 'Beginner', sets: '3', reps: '15-20', rest: '60s', primaryMuscles: ['Glutes'], secondaryMuscles: ['Hamstrings'], description: 'Floor-based hip thrust. Great starting point before adding load.', cues: ['Feet close to glutes', 'Drive hips up', 'Squeeze at top', "Don't hyperextend back"], tip: 'Hold the top position 2 seconds on every rep — the pause forces a true glute contraction.' },
  { name: 'Cable Kickback', category: 'glutes', equipment: 'Cable', difficulty: 'Beginner', sets: '3', reps: '15-20', rest: '60s', primaryMuscles: ['Glutes'], secondaryMuscles: ['Hamstrings'], description: 'Direct glute isolation with constant cable tension. Excellent for shaping and activating the glute.', cues: ['Slight forward lean', 'Keep knee straight', 'Kick back and up', 'Squeeze at peak'], tip: 'Slight hip tuck at the peak locks the glute into full contraction — do not skip this detail.' },
  // ── Cardio ──
  { name: 'Kettlebell Swing', category: 'cardio', equipment: 'Kettlebell', difficulty: 'Intermediate', sets: '4', reps: '15-20', rest: '60s', primaryMuscles: ['Glutes', 'Hamstrings'], secondaryMuscles: ['Core', 'Back'], description: 'Hip hinge power drill that combines posterior chain strength with cardiovascular conditioning.', cues: ['Hip hinge not squat', 'Snap hips forward', 'Arms passive', 'Swing to eye level'], tip: 'The power comes from the hip snap, not shoulder raising. Arms are just a guide.' },
  { name: 'Burpee', category: 'cardio', equipment: 'Bodyweight', difficulty: 'Intermediate', sets: '4', reps: '10-15', rest: '45s', primaryMuscles: ['Full Body'], secondaryMuscles: [], description: 'High-intensity full-body conditioning. Elevates heart rate fast and burns calories efficiently.', cues: ['Chest to floor', 'Jump feet forward', 'Explosive jump up', 'Consistent pace'], tip: 'Pace yourself on sets 1-2 so you can maintain quality on sets 3-4. Fatigued burpees = injury risk.' },
  { name: 'Box Jump', category: 'cardio', equipment: 'Bodyweight', difficulty: 'Advanced', sets: '4', reps: '5-8', rest: '90s', primaryMuscles: ['Quads', 'Glutes'], secondaryMuscles: ['Calves', 'Core'], description: 'Explosive lower body power training. Improves athletic performance and neuromuscular coordination.', cues: ['Soft landing', 'Full hip extension at top', 'Step down not jump', 'Land with bent knees'], tip: 'ALWAYS step down — jumping down from height multiplies impact force and joint stress.' },

  // ── Chest (extra) ──
  { name: 'Dumbbell Fly', category: 'chest', equipment: 'Dumbbells', difficulty: 'Beginner', sets: '3', reps: '12-15', rest: '60s', primaryMuscles: ['Pectorals'], secondaryMuscles: ['Biceps'], description: 'Pure chest stretch and squeeze movement. Prioritises pec lengthening over pressing.', cues: ['Wide arc down', 'Slight elbow bend', 'Feel stretch at bottom', 'Squeeze together'], tip: 'Think hugging a giant tree — the arc motion, not a press.' },
  { name: 'Machine Chest Press', category: 'chest', equipment: 'Machine', difficulty: 'Beginner', sets: '3', reps: '12-15', rest: '60s', primaryMuscles: ['Pectorals'], secondaryMuscles: ['Triceps', 'Front Delts'], description: 'Guided press great for beginners and high-rep burnout sets. No stabiliser fatigue.', cues: ['Set seat so handles align mid-chest', 'Press fully', 'Control return', 'Squeeze peak'], tip: 'Perfect for drop sets — just pin-adjust the weight quickly between sets.' },
  { name: 'Pec Deck Fly', category: 'chest', equipment: 'Machine', difficulty: 'Beginner', sets: '3', reps: '15-20', rest: '60s', primaryMuscles: ['Pectorals'], secondaryMuscles: [], description: 'Isolation machine fly with constant tension. No dumbbell coordination required.', cues: ['Elbows at shoulder height', 'Arc together in front', 'Squeeze 1s at peak', 'Full return'], tip: 'Pause for a full second at peak contraction — that\'s where the growth signal comes from.' },
  { name: 'Close-Grip Bench Press', category: 'chest', equipment: 'Barbell', difficulty: 'Intermediate', sets: '3', reps: '8-12', rest: '90s', primaryMuscles: ['Triceps', 'Inner Pectorals'], secondaryMuscles: ['Front Delts'], description: 'Narrow grip shifts load heavily toward triceps while still training the inner chest.', cues: ['Hands shoulder-width', 'Elbows tucked', 'Bar to lower chest', 'Full lockout'], tip: 'Do not go too narrow — wrists will rotate uncomfortably. Shoulder-width is ideal.' },

  // ── Back (extra) ──
  { name: 'Seated Cable Row', category: 'back', equipment: 'Cable', difficulty: 'Beginner', sets: '4', reps: '10-12', rest: '75s', primaryMuscles: ['Mid Traps', 'Rhomboids'], secondaryMuscles: ['Biceps', 'Lats'], description: 'Best mid-back builder. Targets the muscles between shoulder blades for thickness and posture.', cues: ['Upright torso', 'Row to lower abs', 'Retract shoulder blades', 'Slow release'], tip: 'A slight lean-back on the row then return upright doubles the range and muscles worked.' },
  { name: 'T-Bar Row', category: 'back', equipment: 'Barbell', difficulty: 'Intermediate', sets: '4', reps: '8-10', rest: '90s', primaryMuscles: ['Lats', 'Mid Traps'], secondaryMuscles: ['Biceps', 'Rear Delts'], description: 'Allows very heavy loading with a natural grip. Outstanding for back thickness.', cues: ['Chest on pad', 'Pull elbows high', 'Squeeze at top', 'Full extension down'], tip: 'Using a V-grip handle narrows the grip and shifts load slightly more toward lats.' },
  { name: 'Chin-Up', category: 'back', equipment: 'Bodyweight', difficulty: 'Intermediate', sets: '4', reps: '6-10', rest: '90s', primaryMuscles: ['Lats', 'Biceps'], secondaryMuscles: ['Rear Delts'], description: 'Underhand pull-up variant with greater bicep involvement. Many find this more natural.', cues: ['Supinated grip', 'Dead hang start', 'Pull chest to bar', 'Full lockout'], tip: 'Supinated grip also allows a stronger lat contraction for many people compared to pull-up.' },
  { name: 'Rack Pull', category: 'back', equipment: 'Barbell', difficulty: 'Advanced', sets: '3', reps: '4-6', rest: '3 min', primaryMuscles: ['Spinal Erectors', 'Traps'], secondaryMuscles: ['Lats', 'Glutes'], description: 'Partial deadlift from knee height. Allows supramaximal loading for upper back and trap development.', cues: ['Bar from knee height', 'Neutral spine', 'Drive hips forward', 'Squeeze traps at top'], tip: 'Use straps — grip should not be the limiting factor at these loads.' },
  { name: 'Chest-Supported Row', category: 'back', equipment: 'Dumbbells', difficulty: 'Beginner', sets: '3', reps: '12-15', rest: '60s', primaryMuscles: ['Lats', 'Rhomboids'], secondaryMuscles: ['Biceps'], description: 'Chest pad eliminates cheating and back fatigue, so every rep is pure upper back work.', cues: ['Chest fully on pad', 'Row to hips', 'Full arm extension', 'Squeeze together at top'], tip: 'Best for isolating the back without lower back fatigue — great finisher after heavy rows.' },
  { name: 'Shrug', category: 'back', equipment: 'Barbell', difficulty: 'Beginner', sets: '4', reps: '12-15', rest: '60s', primaryMuscles: ['Upper Traps'], secondaryMuscles: [], description: 'Direct upper trap isolation for a thick, powerful-looking neck-to-shoulder line.', cues: ['Straight up only', 'No rolling', 'Pause at top', 'Full depression down'], tip: 'Rolling the shoulders is a myth that causes injury — straight up and down only.' },

  // ── Legs (extra) ──
  { name: 'Front Squat', category: 'legs', equipment: 'Barbell', difficulty: 'Advanced', sets: '4', reps: '5-8', rest: '2 min', primaryMuscles: ['Quads'], secondaryMuscles: ['Glutes', 'Core', 'Upper Back'], description: 'Bar on front of shoulders forces more upright torso, blasting the quads harder than back squat.', cues: ['Clean grip or cross-arm', 'Elbows high throughout', 'Upright torso', 'Deep squat'], tip: 'Elbow position is everything — if they drop, the bar rolls forward and you dump the lift.' },
  { name: 'Hack Squat', category: 'legs', equipment: 'Machine', difficulty: 'Intermediate', sets: '4', reps: '10-12', rest: '90s', primaryMuscles: ['Quads'], secondaryMuscles: ['Glutes'], description: 'Machine squat variation that isolates quads with minimal spinal load.', cues: ['Feet shoulder-width', 'Deep ROM', 'Control descent', 'Drive through heels'], tip: 'Set feet lower on the platform to increase quad range; higher emphasises glutes.' },
  { name: 'Walking Lunge', category: 'legs', equipment: 'Dumbbells', difficulty: 'Intermediate', sets: '3', reps: '12 each leg', rest: '90s', primaryMuscles: ['Quads', 'Glutes'], secondaryMuscles: ['Hamstrings', 'Core'], description: 'Unilateral movement that trains balance, coordination, and leg strength simultaneously.', cues: ['Long stride', 'Knee grazes floor', 'Torso upright', 'Drive front heel'], tip: 'Short strides hit quads more; long strides shift load to glutes. Choose your target.' },
  { name: 'Leg Extension', category: 'legs', equipment: 'Machine', difficulty: 'Beginner', sets: '3', reps: '15-20', rest: '45s', primaryMuscles: ['Quads'], secondaryMuscles: [], description: 'Direct quad isolation. Great pre-exhaust tool and safe for knee rehabilitation when done correctly.', cues: ['Full extension', 'Slow eccentric', 'Pause at top', 'Toes pointed'], tip: 'Extend fully but do not hyperextend — lock out gently to maximise quad contraction.' },
  { name: 'Seated Calf Raise', category: 'legs', equipment: 'Machine', difficulty: 'Beginner', sets: '4', reps: '15-20', rest: '45s', primaryMuscles: ['Soleus'], secondaryMuscles: [], description: 'Seated position targets the soleus — the deeper calf muscle that gives thickness, not just shape.', cues: ['Full stretch at bottom', 'Pause at bottom', 'Rise to toes', 'Hold 1s at top'], tip: 'The soleus is primarily slow-twitch — it responds best to high reps with a slow tempo.' },
  { name: 'Sumo Squat', category: 'legs', equipment: 'Dumbbells', difficulty: 'Beginner', sets: '3', reps: '12-15', rest: '60s', primaryMuscles: ['Glutes', 'Inner Thighs'], secondaryMuscles: ['Quads', 'Hamstrings'], description: 'Wide stance squat emphasising inner thighs and glutes over quads. Beginner-friendly.', cues: ['Feet wider than shoulders', 'Toes out 45°', 'Sit between heels', 'Keep chest up'], tip: 'Hold one dumbbell vertically between legs for a natural centre-of-gravity drop.' },
  { name: 'Step-Up', category: 'legs', equipment: 'Dumbbells', difficulty: 'Beginner', sets: '3', reps: '12 each leg', rest: '60s', primaryMuscles: ['Quads', 'Glutes'], secondaryMuscles: ['Hamstrings', 'Calves'], description: 'Unilateral compound movement. Simple, joint-friendly, and highly effective for leg development.', cues: ['Full foot on box', 'Drive through heel', 'Stand tall at top', 'Control descent'], tip: 'Higher box = more glute; lower box = more quad. Adjust height to target.' },
  { name: 'Nordic Curl', category: 'legs', equipment: 'Bodyweight', difficulty: 'Advanced', sets: '3', reps: '5-8', rest: '2 min', primaryMuscles: ['Hamstrings'], secondaryMuscles: ['Glutes', 'Calves'], description: 'The gold-standard hamstring exercise for injury prevention. Extremely difficult but highly effective.', cues: ['Feet anchored', 'Body straight', 'Lower slowly', 'Push-up to return'], tip: 'Most people need 4-6 weeks of negatives before doing a full rep. Start there.' },

  // ── Shoulders (extra) ──
  { name: 'Cable Lateral Raise', category: 'shoulders', equipment: 'Cable', difficulty: 'Beginner', sets: '4', reps: '15-20', rest: '60s', primaryMuscles: ['Side Delts'], secondaryMuscles: [], description: 'Constant cable tension through the full arc. Harder at the bottom and top than dumbbell version.', cues: ['Cable low to floor', 'Cross-body cable', 'Raise to shoulder level', 'Slow return'], tip: 'The cable coming from the opposite hip creates continuous tension even at the bottom — exploit it.' },
  { name: 'Dumbbell Front Raise', category: 'shoulders', equipment: 'Dumbbells', difficulty: 'Beginner', sets: '3', reps: '12-15', rest: '60s', primaryMuscles: ['Front Delts'], secondaryMuscles: ['Side Delts'], description: 'Anterior delt isolation. Pairs with rear-delt work for balanced shoulder development.', cues: ['Slight forward lean', 'Raise to eye level', 'Pronated grip', 'Slow eccentric'], tip: 'Most pressers already have overdeveloped front delts — do NOT skip the rear delt work to balance.' },
  { name: 'Upright Row', category: 'shoulders', equipment: 'Barbell', difficulty: 'Intermediate', sets: '3', reps: '10-12', rest: '75s', primaryMuscles: ['Side Delts', 'Upper Traps'], secondaryMuscles: ['Biceps'], description: 'Compound shoulder and trap movement. Use a wide grip to reduce impingement risk.', cues: ['Wide grip', 'Lead with elbows', 'Pull to chin level', 'Elbows above hands'], tip: 'Narrow grip increases impingement risk. Keep grip wider than shoulder-width.' },
  { name: 'Machine Shoulder Press', category: 'shoulders', equipment: 'Machine', difficulty: 'Beginner', sets: '3', reps: '12-15', rest: '75s', primaryMuscles: ['Front Delts', 'Side Delts'], secondaryMuscles: ['Triceps'], description: 'Guided press for safe high-rep shoulder work. Great for beginners and drop sets.', cues: ['Seat height aligned with shoulders', 'Press fully', 'Control down', 'No momentum'], tip: 'Ideal for training to failure safely when you have no spotter for barbell press.' },
  { name: 'Band Pull-Apart', category: 'shoulders', equipment: 'Bodyweight', difficulty: 'Beginner', sets: '3', reps: '20-25', rest: '30s', primaryMuscles: ['Rear Delts', 'Mid Traps'], secondaryMuscles: ['External Rotators'], description: 'Simple band exercise for rear delts and mid traps. Excellent warm-up and postural correction tool.', cues: ['Arms straight', 'Pull to chest', 'Squeeze shoulder blades', 'Slow return'], tip: 'Do these as a warm-up before every upper body session. 25 reps takes 30 seconds and pays huge dividends.' },

  // ── Arms (extra) ──
  { name: 'Concentration Curl', category: 'arms', equipment: 'Dumbbells', difficulty: 'Beginner', sets: '3', reps: '12-15', rest: '45s', primaryMuscles: ['Biceps Peak'], secondaryMuscles: [], description: 'Elbow braced on thigh eliminates cheating. Best exercise for developing bicep peak.', cues: ['Elbow on inner thigh', 'Supinate fully at top', 'Full extension', 'No body sway'], tip: 'Supinating (twisting the wrist outward) at the top of each curl activates the short head more for peak.' },
  { name: 'EZ-Bar Curl', category: 'arms', equipment: 'Barbell', difficulty: 'Beginner', sets: '3', reps: '10-12', rest: '60s', primaryMuscles: ['Biceps'], secondaryMuscles: ['Brachialis'], description: 'Angled grip reduces wrist strain compared to straight bar. Slightly changes the muscle recruitment pattern.', cues: ['Semi-supinated grip', 'Elbows stay back', 'Curl to shoulders', 'Slow eccentric'], tip: 'Great option if straight bar curls hurt your wrists — the EZ bar is kinder to the forearm pronators.' },
  { name: 'Cable Curl', category: 'arms', equipment: 'Cable', difficulty: 'Beginner', sets: '3', reps: '12-15', rest: '45s', primaryMuscles: ['Biceps'], secondaryMuscles: [], description: 'Constant cable tension means the muscle is loaded at the bottom of the curl — unlike dumbbells.', cues: ['Cable at low position', 'Elbows pinned', 'Full curl', 'No swinging'], tip: 'The bottom of the curl is where dumbbell tension disappears — cable keeps it loaded throughout.' },
  { name: 'Incline Dumbbell Curl', category: 'arms', equipment: 'Dumbbells', difficulty: 'Intermediate', sets: '3', reps: '10-12', rest: '60s', primaryMuscles: ['Biceps Long Head'], secondaryMuscles: [], description: 'Incline bench places the arm behind the body, stretching the long head fully. Best exercise for bicep length.', cues: ['Arms hang freely', 'Do not swing', 'Full supination', 'Slow and controlled'], tip: 'The stretched position at the bottom is where most of the muscle damage and growth happens — do not rush it.' },
  { name: 'Preacher Curl', category: 'arms', equipment: 'Barbell', difficulty: 'Beginner', sets: '3', reps: '10-12', rest: '60s', primaryMuscles: ['Biceps Short Head'], secondaryMuscles: ['Brachialis'], description: 'Arm supported on angled pad prevents cheating. Heavy bottom-range loading.', cues: ['Chest on pad', 'Full extension at bottom', 'Squeeze at top', 'Slow down'], tip: 'The stretch at the bottom is intense — do not lock out aggressively or risk a bicep tear.' },
  { name: 'Diamond Push-Up', category: 'arms', equipment: 'Bodyweight', difficulty: 'Intermediate', sets: '3', reps: '12-15', rest: '60s', primaryMuscles: ['Triceps'], secondaryMuscles: ['Inner Chest'], description: 'Narrow hand position shifts the press entirely to triceps. No equipment needed.', cues: ['Hands form diamond', 'Elbows close to body', 'Chest to hands', 'Full lockout'], tip: 'Place hands below your sternum, not under your chin — that is the correct position.' },
  { name: 'Dips (Triceps)', category: 'arms', equipment: 'Bodyweight', difficulty: 'Intermediate', sets: '3', reps: '10-15', rest: '90s', primaryMuscles: ['Triceps'], secondaryMuscles: ['Front Delts', 'Chest'], description: 'Upright dip positions the body for maximum tricep load. One of the best mass builders for the back of the arm.', cues: ['Stay upright', 'Elbows back not flared', 'Lower to 90° elbow', 'Full lockout'], tip: 'Leaning forward shifts load to chest. Stay upright to keep tension on the triceps.' },

  // ── Core (extra) ──
  { name: 'Cable Crunch', category: 'core', equipment: 'Cable', difficulty: 'Beginner', sets: '4', reps: '15-20', rest: '45s', primaryMuscles: ['Rectus Abdominis'], secondaryMuscles: [], description: 'Weighted crunch using cable for progressive overload. One of the only weighted ab exercises with a clear progression.', cues: ['Kneel facing cable', 'Elbows to thighs', 'Crunch from hips', 'Do not pull with arms'], tip: 'The movement happens at the spine — if you\'re pulling with your arms you\'re missing the point.' },
  { name: 'Russian Twist', category: 'core', equipment: 'Bodyweight', difficulty: 'Intermediate', sets: '3', reps: '20 total', rest: '45s', primaryMuscles: ['Obliques'], secondaryMuscles: ['Rectus Abdominis'], description: 'Rotational core exercise targeting the obliques. Add a plate or dumbbell for progressive overload.', cues: ['Feet off floor', 'Rotate fully each side', 'Touch floor beside hip', 'Brace core'], tip: 'Heels slightly off the floor dramatically increases the difficulty and oblique activation.' },
  { name: 'Decline Sit-Up', category: 'core', equipment: 'Bodyweight', difficulty: 'Intermediate', sets: '3', reps: '15-20', rest: '45s', primaryMuscles: ['Rectus Abdominis'], secondaryMuscles: ['Hip Flexors'], description: 'Full range sit-up from a declined angle. Greater ROM than flat sit-ups with more resistance.', cues: ['Hook feet', 'Hands to temples', 'Curl up slowly', 'Full extension back'], tip: 'Hold a weight plate on your chest to add progressive overload as bodyweight becomes easy.' },
  { name: 'Pallof Press', category: 'core', equipment: 'Cable', difficulty: 'Intermediate', sets: '3', reps: '12 each side', rest: '45s', primaryMuscles: ['Transverse Abdominis', 'Obliques'], secondaryMuscles: ['Glutes'], description: 'Anti-rotation core exercise. Trains the core to resist twisting forces — critical for sports and injury prevention.', cues: ['Stand side-on to cable', 'Press straight out', 'Hold 2s', 'Do not twist'], tip: 'The further from the anchor you stand, the harder the anti-rotation demand. Progress by stepping away.' },
  { name: 'Side Plank', category: 'core', equipment: 'Bodyweight', difficulty: 'Beginner', sets: '3', reps: '30-45s each side', rest: '30s', primaryMuscles: ['Obliques', 'Quadratus Lumborum'], secondaryMuscles: ['Glutes', 'Hip Abductors'], description: 'Lateral core stability. Essential for preventing lateral spine flexion under load.', cues: ['Stack feet', 'Hip off floor', 'Body straight', 'Breathe steadily'], tip: 'Progress by lifting the top leg or adding a reach-under rotation.' },
  { name: 'Landmine Rotation', category: 'core', equipment: 'Barbell', difficulty: 'Intermediate', sets: '3', reps: '10 each side', rest: '45s', primaryMuscles: ['Obliques'], secondaryMuscles: ['Shoulders', 'Transverse Abdominis'], description: 'Powerful rotational core exercise. Transfers directly to athletic performance.', cues: ['Feet shoulder-width', 'Rotate from hips', 'Arms slightly bent', 'Control return'], tip: 'Drive the rotation from your hips, not your arms — this is a core exercise, not a shoulder exercise.' },

  // ── Glutes (extra) ──
  { name: 'Single-Leg RDL', category: 'glutes', equipment: 'Dumbbells', difficulty: 'Intermediate', sets: '3', reps: '10 each leg', rest: '75s', primaryMuscles: ['Glutes', 'Hamstrings'], secondaryMuscles: ['Core', 'Hip Stabilisers'], description: 'Unilateral hip hinge. Fixes left-right imbalances and demands significant balance and stability.', cues: ['Hinge at hip', 'Back leg extends back', 'Flat back throughout', 'Weight under hip'], tip: 'Focus on hip hinge and hamstring stretch — the balance will come. Do not rush the movement.' },
  { name: 'Abductor Machine', category: 'glutes', equipment: 'Machine', difficulty: 'Beginner', sets: '3', reps: '20-25', rest: '45s', primaryMuscles: ['Glute Medius', 'Hip Abductors'], secondaryMuscles: [], description: 'Targets the glute medius — the side of the glute that creates the hip-curve shape.', cues: ['Full outer rotation', 'Squeeze at peak', 'Slow controlled return', 'Upright posture'], tip: 'Lean slightly forward to shift more tension onto glute med instead of TFL.' },
  { name: 'Donkey Kick', category: 'glutes', equipment: 'Bodyweight', difficulty: 'Beginner', sets: '3', reps: '15-20 each leg', rest: '45s', primaryMuscles: ['Glutes'], secondaryMuscles: ['Hamstrings'], description: 'Bodyweight glute isolation. Great as a warm-up activation or finisher for high-rep glute work.', cues: ['On all fours', 'Drive heel to ceiling', 'Squeeze at top', 'Keep hips square'], tip: 'A resistance band around the thigh dramatically increases the difficulty and glute activation.' },
  { name: 'Sumo Deadlift', category: 'glutes', equipment: 'Barbell', difficulty: 'Intermediate', sets: '4', reps: '6-8', rest: '2 min', primaryMuscles: ['Glutes', 'Inner Thighs'], secondaryMuscles: ['Hamstrings', 'Quads'], description: 'Wide stance deadlift with more upright torso and greater glute and inner thigh recruitment.', cues: ['Feet wide, toes out', 'Grip inside legs', 'Chest up', 'Push knees out'], tip: 'Cue yourself to push the floor apart with your feet — this activates the hips and keeps knees over toes.' },
  { name: 'Frog Pump', category: 'glutes', equipment: 'Bodyweight', difficulty: 'Beginner', sets: '3', reps: '20-30', rest: '30s', primaryMuscles: ['Glutes'], secondaryMuscles: [], description: 'Floor exercise with feet together and knees out. Superior glute activation without the lower back fatigue.', cues: ['Soles of feet together', 'Knees out wide', 'Drive hips up', 'Squeeze hard at top'], tip: 'A 2-second hold at the top turns this gentle movement into a serious glute builder.' },

  // ── Cardio (extra) ──
  { name: 'Mountain Climber', category: 'cardio', equipment: 'Bodyweight', difficulty: 'Beginner', sets: '4', reps: '20-30s', rest: '30s', primaryMuscles: ['Core', 'Hip Flexors'], secondaryMuscles: ['Shoulders', 'Chest'], description: 'Running in place in push-up position. Combines core stability with cardiovascular demand.', cues: ['Hips level', 'Fast alternating drive', 'Arms stay straight', 'Breathe rhythmically'], tip: 'Keep hips level with shoulders — if they rise, slow down and control the movement.' },
  { name: 'Jump Rope', category: 'cardio', equipment: 'Bodyweight', difficulty: 'Beginner', sets: '5', reps: '60s on / 30s off', rest: '30s', primaryMuscles: ['Calves', 'Cardiovascular System'], secondaryMuscles: ['Shoulders', 'Core'], description: 'Excellent low-cost conditioning tool. Burns calories fast and improves coordination and timing.', cues: ['Jump on toes only', 'Small jumps', 'Wrists do the turning', 'Consistent rhythm'], tip: 'Start with 30-second intervals and build up. Even elite athletes find this humbling.' },
  { name: 'Rowing Machine', category: 'cardio', equipment: 'Machine', difficulty: 'Beginner', sets: '1', reps: '15-20 min', rest: '–', primaryMuscles: ['Back', 'Quads', 'Arms'], secondaryMuscles: ['Core', 'Glutes'], description: 'Full-body cardio machine that is joint-friendly and burns calories effectively. Often underused in gyms.', cues: ['Legs push first', 'Then lean back', 'Then pull arms', 'Reverse on return'], tip: 'Order matters: legs → back → arms on the drive. Most people pull with arms first and miss 70% of the power.' },
  { name: 'Sprint Intervals', category: 'cardio', equipment: 'Bodyweight', difficulty: 'Advanced', sets: '6-10', reps: '20s sprint / 40s walk', rest: '40s walk', primaryMuscles: ['Quads', 'Glutes', 'Hamstrings'], secondaryMuscles: ['Core', 'Calves'], description: 'Maximum effort sprints followed by recovery walks. Best fat-loss cardio protocol by calorie burn and EPOC.', cues: ['Maximum effort', 'Drive arms', 'Full stride length', 'Recover fully before next'], tip: 'True sprint intervals require genuine maximum effort sprints — jogging faster does not count.' },
  { name: 'Assault Bike', category: 'cardio', equipment: 'Machine', difficulty: 'Intermediate', sets: '5-8', reps: '20s hard / 40s easy', rest: '40s easy', primaryMuscles: ['Full Body', 'Cardiovascular System'], secondaryMuscles: [], description: 'Full-body fan bike used for brutal HIIT intervals. Arms and legs both drive the resistance.', cues: ['Push and pull handles', 'Steady base cadence', 'Explode on work sets', 'Stay seated'], tip: 'The bike scales itself — the harder you push, the harder it gets. There is no upper limit.' },
];

// ── Lookup maps ───────────────────────────────────────────────────────────────

const DIFF_COLORS: Record<string, string> = {
  Beginner: '#34d399', Intermediate: '#ff8c00', Advanced: '#ff2d55',
};

const CAT_GRADIENTS: Record<string, [string, string]> = {
  chest:     ['#FF6B35', '#ff2d55'],
  back:      ['#00d4ff', '#0084ff'],
  legs:      ['#34d399', '#059669'],
  shoulders: ['#bf5af2', '#5e5ce6'],
  arms:      ['#ff8c00', '#FF6B35'],
  core:      ['#00bcd4', '#34d399'],
  glutes:    ['#ff2d55', '#bf5af2'],
  cardio:    ['#ff8c00', '#ff2d55'],
};

const CAT_ICON_MAP: Record<string, React.ComponentType<any>> = {
  all: Zap, chest: Shield, back: TrendingUp, legs: Activity,
  shoulders: Target, arms: Dumbbell, core: Flame, glutes: Activity, cardio: Zap,
};

const CATEGORIES = [
  { id: 'all',       label: 'All',       Icon: Zap       },
  { id: 'chest',     label: 'Chest',     Icon: Shield    },
  { id: 'back',      label: 'Back',      Icon: TrendingUp },
  { id: 'legs',      label: 'Legs',      Icon: Activity  },
  { id: 'shoulders', label: 'Shoulders', Icon: Target    },
  { id: 'arms',      label: 'Arms',      Icon: Dumbbell  },
  { id: 'core',      label: 'Core',      Icon: Flame     },
  { id: 'glutes',    label: 'Glutes',    Icon: Activity  },
  { id: 'cardio',    label: 'Cardio',    Icon: Zap       },
];

const EQUIPMENT_FILTERS = ['All', 'Barbell', 'Dumbbells', 'Cable', 'Bodyweight', 'Machine', 'Kettlebell'];
const DIFFICULTY_FILTERS: Array<string | null> = [null, 'Beginner', 'Intermediate', 'Advanced'];

// ── Flip card ─────────────────────────────────────────────────────────────────

function ExerciseCard({ exercise, onOpenDetail }: { exercise: Exercise; onOpenDetail: (ex: Exercise) => void }) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const gradColors = CAT_GRADIENTS[exercise.category] ?? ['#FF6B35', '#ff2d55'];
  const CatIcon = CAT_ICON_MAP[exercise.category] ?? Dumbbell;
  const diffColor = DIFF_COLORS[exercise.difficulty];

  const flip = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setSide((s) => (s === 'front' ? 'back' : 'front')), 140);
  }, []);

  return (
    <TouchableOpacity onPress={flip} activeOpacity={1} style={ss.cardOuter}>
      <Animated.View style={[ss.card, { transform: [{ scaleX: scaleAnim }] }]}>
        {side === 'front' ? (
          <LinearGradient colors={[gradColors[0] + 'cc', gradColors[1] + 'cc']} style={ss.cardFront}
            start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}>
            <View style={ss.cardWatermark}>
              <CatIcon size={80} color="rgba(255,255,255,0.07)" strokeWidth={1} />
            </View>
            <View style={[ss.diffBadge, { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: diffColor + '60' }]}>
              <View style={[ss.diffDot, { backgroundColor: diffColor }]} />
              <Text style={[ss.diffText, { color: diffColor }]}>{exercise.difficulty}</Text>
            </View>
            <View style={ss.cardIconWrap}>
              <CatIcon size={36} color="#fff" strokeWidth={1.6} />
            </View>
            <Text style={ss.cardName} numberOfLines={2}>{exercise.name}</Text>
            <Text style={ss.cardMuscle} numberOfLines={1}>{exercise.primaryMuscles[0]}</Text>
            <View style={ss.flipHint}>
              <RotateCcw size={10} color="rgba(255,255,255,0.45)" />
              <Text style={ss.flipHintText}>tap to flip</Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={ss.cardBack}>
            <View style={[ss.cardBackAccent, { backgroundColor: gradColors[0] + '22' }]} />
            <View style={ss.backStatsRow}>
              {[
                { icon: <Repeat size={11} color={gradColors[0]} />, val: exercise.sets, label: 'sets' },
                { icon: <TrendingUp size={11} color={gradColors[0]} />, val: exercise.reps, label: 'reps' },
                { icon: <Timer size={11} color={gradColors[0]} />, val: exercise.rest, label: 'rest' },
              ].map((s) => (
                <View key={s.label} style={ss.backStat}>
                  {s.icon}
                  <Text style={[ss.backStatVal, { color: gradColors[0] }]}>{s.val}</Text>
                  <Text style={ss.backStatLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
            <View style={ss.backCues}>
              {exercise.cues.slice(0, 2).map((c, i) => (
                <View key={i} style={ss.backCueRow}>
                  <View style={[ss.backCueDot, { backgroundColor: gradColors[0] }]} />
                  <Text style={ss.backCueText} numberOfLines={1}>{c}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => onOpenDetail(exercise)}
              style={[ss.detailBtn, { borderColor: gradColors[0] + '50', backgroundColor: gradColors[0] + '18' }]}
            >
              <Info size={11} color={gradColors[0]} />
              <Text style={[ss.detailBtnText, { color: gradColors[0] }]}>Full guide + video</Text>
              <ChevronRight size={11} color={gradColors[0]} />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Detail modal (4-page swipeable) ──────────────────────────────────────────

const DETAIL_PAGES = ['Overview', 'How to Do It', 'Protocol', 'Watch Demo'];

function DetailModal({ ex, onClose }: { ex: Exercise | null; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const listRef = useRef<FlatList>(null);
  const gradColors = ex ? (CAT_GRADIENTS[ex.category] ?? ['#FF6B35', '#ff2d55']) : ['#FF6B35', '#ff2d55'];
  const diffColor = ex ? DIFF_COLORS[ex.difficulty] : '#34d399';

  if (!ex) return null;

  function goToPage(idx: number) {
    setPage(idx);
    listRef.current?.scrollToIndex({ index: idx, animated: true });
  }

  const pages = [
    // Page 0 — Overview
    <ScrollView key="overview" style={ss.page} showsVerticalScrollIndicator={false}>
      <Text style={ss.pageDesc}>{ex.description}</Text>
      <Text style={ss.pageSubLabel}>Primary muscles</Text>
      <View style={ss.muscleRow}>
        {ex.primaryMuscles.map((m) => (
          <View key={m} style={[ss.musclePill, { backgroundColor: gradColors[0] + '22', borderColor: gradColors[0] + '50' }]}>
            <Text style={[ss.muscleText, { color: gradColors[0] }]}>{m}</Text>
          </View>
        ))}
      </View>
      {ex.secondaryMuscles.length > 0 && (
        <>
          <Text style={ss.pageSubLabel}>Secondary</Text>
          <View style={ss.muscleRow}>
            {ex.secondaryMuscles.map((m) => (
              <View key={m} style={[ss.musclePill, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }]}>
                <Text style={[ss.muscleText, { color: 'rgba(255,255,255,0.5)' }]}>{m}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      {ex.tip && (
        <View style={[ss.tipBox, { borderLeftColor: gradColors[0] }]}>
          <Text style={ss.tipLabel}>Coach tip</Text>
          <Text style={ss.tipText}>{ex.tip}</Text>
        </View>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>,

    // Page 1 — How to Do It
    <ScrollView key="how" style={ss.page} showsVerticalScrollIndicator={false}>
      {ex.cues.map((cue, i) => (
        <View key={i} style={ss.cueRow}>
          <LinearGradient colors={[gradColors[0], gradColors[1]]} style={ss.cueNum}>
            <Text style={ss.cueNumText}>{i + 1}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={ss.cueText}>{cue}</Text>
          </View>
        </View>
      ))}
      <View style={[ss.equipRow, { backgroundColor: gradColors[0] + '12', borderColor: gradColors[0] + '30' }]}>
        <Dumbbell size={14} color={gradColors[0]} />
        <Text style={[ss.equipText, { color: gradColors[0] }]}>{ex.equipment}</Text>
        <View style={ss.equipDivider} />
        <Target size={14} color="rgba(255,255,255,0.4)" />
        <Text style={ss.equipTextGray}>{ex.category.charAt(0).toUpperCase() + ex.category.slice(1)}</Text>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>,

    // Page 2 — Protocol
    <ScrollView key="protocol" style={ss.page} showsVerticalScrollIndicator={false}>
      <View style={ss.protoGrid}>
        {[
          { label: 'Sets', value: ex.sets, color: gradColors[0], icon: <Repeat size={20} color={gradColors[0]} /> },
          { label: 'Reps', value: ex.reps, color: gradColors[1], icon: <TrendingUp size={20} color={gradColors[1]} /> },
          { label: 'Rest', value: ex.rest, color: '#bf5af2', icon: <Timer size={20} color="#bf5af2" /> },
        ].map((s) => (
          <View key={s.label} style={[ss.protoBox, { borderColor: s.color + '30', backgroundColor: s.color + '0f' }]}>
            {s.icon}
            <Text style={[ss.protoValue, { color: s.color }]}>{s.value}</Text>
            <Text style={ss.protoLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      <View style={ss.protoNote}>
        <Text style={ss.protoNoteLabel}>Difficulty</Text>
        <View style={[ss.diffChip, { backgroundColor: diffColor + '22', borderColor: diffColor + '55' }]}>
          <View style={[ss.diffDot, { backgroundColor: diffColor }]} />
          <Text style={[ss.diffText, { color: diffColor }]}>{ex.difficulty}</Text>
        </View>
      </View>
      <Text style={ss.protoProgNote}>
        Progress by adding weight when you consistently hit the top of the rep range with clean form across all sets.
      </Text>
      <View style={{ height: 24 }} />
    </ScrollView>,

    // Page 3 — Watch Demo (in-app animated demo, no third-party content)
    <ScrollView key="demo" style={ss.page} showsVerticalScrollIndicator={false}>
      {/* Code-driven animation — beats through the exercise cues */}
      <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
        <ExerciseAnimationView
          exerciseName={ex.name}
          category={ex.category}
          primaryMuscles={ex.primaryMuscles}
          cues={ex.cues}
          tip={ex.tip}
        />
      </View>

      {/* How to read the demo */}
      <Text style={[ss.pageSubLabel, { marginTop: 4 }]}>How to use this demo</Text>
      {[
        'Watch the phase label — SETUP, EXECUTE, PEAK, CONTROL tell you where you are in the rep',
        'The outer ring shows primary muscle activation level — fuller = more contraction',
        'Each coaching cue cycles automatically — memorise them before you lift',
        'The rings dim during CONTROL and BREATHE phases — that\'s when to slow down',
      ].map((t, i) => (
        <View key={i} style={ss.demoTipRow}>
          <View style={[ss.demoTipDot, { backgroundColor: gradColors[0] }]} />
          <Text style={ss.demoTipText}>{t}</Text>
        </View>
      ))}

      {ex.tip && (
        <View style={[ss.tipBox, { borderLeftColor: gradColors[0], marginTop: 16 }]}>
          <Text style={ss.tipLabel}>Coach tip</Text>
          <Text style={ss.tipText}>{ex.tip}</Text>
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>,
  ];

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={ss.overlay}>
        <View style={ss.sheet}>
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={ss.handle} />
          </View>

          {/* Header */}
          <LinearGradient
            colors={[gradColors[0] + '28', '#0f0f1a00']}
            style={ss.modalHero}
          >
            <View style={{ flex: 1 }}>
              <View style={[ss.diffChip, { backgroundColor: diffColor + '22', borderColor: diffColor + '55', alignSelf: 'flex-start' }]}>
                <View style={[ss.diffDot, { backgroundColor: diffColor }]} />
                <Text style={[ss.diffText, { color: diffColor }]}>{ex.difficulty}</Text>
              </View>
              <Text style={ss.modalName}>{ex.name}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>
                {ex.equipment} · {ex.category.charAt(0).toUpperCase() + ex.category.slice(1)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={ss.closeBtn}>
              <X size={16} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />
            </TouchableOpacity>
          </LinearGradient>

          {/* Page tabs */}
          <View style={ss.pageTabs}>
            {DETAIL_PAGES.map((label, idx) => (
              <TouchableOpacity
                key={label}
                onPress={() => goToPage(idx)}
                style={[ss.pageTab, page === idx && { borderBottomColor: gradColors[0] }]}
              >
                <Text style={[ss.pageTabText, page === idx && { color: gradColors[0] }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Swipeable pages */}
          <FlatList
            ref={listRef}
            data={pages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => item}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / W);
              setPage(idx);
            }}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function ExerciseLibraryScreen() {
  const [category, setCategory] = useState('all');
  const [equipment, setEquipment] = useState('All');
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Exercise | null>(null);

  const filtered = useMemo(() => EXERCISES.filter((e) => {
    if (category !== 'all' && e.category !== category) return false;
    if (equipment !== 'All' && e.equipment !== equipment) return false;
    if (difficulty && e.difficulty !== difficulty) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [category, equipment, difficulty, search]);

  const activeFiltersCount = (equipment !== 'All' ? 1 : 0) + (difficulty ? 1 : 0);

  function clearAll() { setCategory('all'); setEquipment('All'); setDifficulty(null); setSearch(''); }

  const renderCard = useCallback(({ item, index }: { item: Exercise; index: number }) => {
    const isLeft = index % 2 === 0;
    return (
      <FadeIn delay={index < 10 ? index * 40 : 0} fromY={14} fromScale={0.95}
        style={{ marginLeft: isLeft ? 0 : 10 }}>
        <ExerciseCard exercise={item} onOpenDetail={setSelected} />
      </FadeIn>
    );
  }, []);

  return (
    <View style={ss.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* ── Header ── */}
        <View style={ss.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
            <View>
              <Text style={ss.title}>Library</Text>
              <Text style={ss.subtitle}>{EXERCISES.length} exercises · tap to flip · swipe detail pages</Text>
            </View>
            {activeFiltersCount > 0 && (
              <TouchableOpacity onPress={clearAll} style={ss.clearAllBtn}>
                <X size={12} color="#FF6B35" strokeWidth={2.5} />
                <Text style={ss.clearAllText}>Clear {activeFiltersCount}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search */}
          <View style={ss.searchBar}>
            <Search size={16} color="rgba(255,255,255,0.3)" />
            <TextInput
              style={ss.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor="rgba(255,255,255,0.22)"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={15} color="rgba(255,255,255,0.35)" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Category pills ── */}
        <View style={ss.filterRowWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={ss.filterRow}>
            {CATEGORIES.map((c) => {
              const Icon = c.Icon;
              const active = category === c.id;
              const grad = CAT_GRADIENTS[c.id] ?? ['#FF6B35', '#ff2d55'];
              return (
                <TouchableOpacity key={c.id} onPress={() => setCategory(c.id)} activeOpacity={0.75}
                  style={[ss.catPill, {
                    backgroundColor: active ? grad[0] : grad[0] + '33',
                    borderColor: active ? 'transparent' : grad[0] + 'aa',
                  }]}>
                  <Icon size={13} color="#fff" strokeWidth={2} />
                  <Text style={ss.catPillText}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Equipment + Difficulty in one clean row ── */}
        <View style={ss.filterSection}>
          <Text style={ss.filterSectionLabel}>Equipment</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 20 }}>
            {EQUIPMENT_FILTERS.map((eq) => {
              const active = equipment === eq;
              return (
                <TouchableOpacity key={eq} onPress={() => setEquipment(eq)} activeOpacity={0.75}
                  style={[ss.filterChip, active && ss.filterChipActive]}>
                  <Text style={[ss.filterChipText, active && ss.filterChipTextActive]}>{eq}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={[ss.filterSection, { marginBottom: 6 }]}>
          <Text style={ss.filterSectionLabel}>Level</Text>
          <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20 }}>
            {DIFFICULTY_FILTERS.map((d) => {
              const active = difficulty === d;
              const color = d ? DIFF_COLORS[d] : '#FF6B35';
              return (
                <TouchableOpacity key={d ?? 'all'} onPress={() => setDifficulty(d)} activeOpacity={0.75}
                  style={[ss.levelChip, active && { backgroundColor: color + '22', borderColor: color }]}>
                  {d && <View style={[ss.diffDot, { backgroundColor: d ? DIFF_COLORS[d] : '#fff', opacity: active ? 1 : 0.4 }]} />}
                  <Text style={[ss.levelChipText, active && { color }]}>{d ?? 'All'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Result count */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8, gap: 8 }}>
          <Text style={ss.countText}>{filtered.length} exercises</Text>
          {activeFiltersCount > 0 && (
            <View style={ss.activeFilterBadge}>
              <Text style={ss.activeFilterBadgeText}>{activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active</Text>
            </View>
          )}
        </View>

        {/* ── Grid ── */}
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={(item) => item.name}
          renderItem={renderCard}
          contentContainerStyle={ss.grid}
          columnWrapperStyle={{ justifyContent: 'flex-start' }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={ss.empty}>
              <Dumbbell size={44} color="rgba(255,255,255,0.1)" strokeWidth={1.2} />
              <Text style={ss.emptyText}>No exercises match your filters</Text>
              <TouchableOpacity onPress={clearAll}>
                <Text style={{ color: '#FF6B35', fontWeight: '700', marginTop: 8, fontSize: 14 }}>Clear all filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </SafeAreaView>

      {selected && <DetailModal ex={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#09090e' },
  header:   { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
  title:    { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { color: 'rgba(255,255,255,0.28)', fontSize: 12, marginTop: 2 },

  clearAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,107,53,0.35)',
    backgroundColor: 'rgba(255,107,53,0.1)',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  clearAllText: { color: '#FF6B35', fontSize: 12, fontWeight: '700' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, padding: 0 },

  // Category pills
  filterRowWrap: { marginTop: 8, marginBottom: 14 },
  filterRow: { paddingHorizontal: 20, gap: 8 },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1.5,
  },
  catPillText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Filter section
  filterSection: { marginBottom: 8 },
  filterSectionLabel: {
    color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800',
    letterSpacing: 1.5, textTransform: 'uppercase',
    paddingHorizontal: 20, marginBottom: 7,
  },

  // Equipment chips
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(191,90,242,0.22)',
    borderColor: '#bf5af2',
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.78)' },
  filterChipTextActive: { color: '#bf5af2', fontWeight: '700' },

  // Level chips
  levelChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  levelChipText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.78)' },

  countText: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '600' },
  activeFilterBadge: {
    backgroundColor: 'rgba(255,107,53,0.15)', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  activeFilterBadgeText: { color: '#FF6B35', fontSize: 10, fontWeight: '700' },

  grid: { paddingHorizontal: 20, paddingBottom: 40 },

  // Card
  cardOuter: { width: CARD_W, marginBottom: 10 },
  card: { width: CARD_W, height: CARD_H, borderRadius: 20, overflow: 'hidden' },
  cardFront: { flex: 1, padding: 14, justifyContent: 'space-between' },
  cardWatermark: { position: 'absolute', bottom: -8, right: -8, opacity: 1 },

  diffBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  diffDot: { width: 5, height: 5, borderRadius: 3 },
  diffText: { fontSize: 10, fontWeight: '800' },
  diffChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4,
  },

  cardIconWrap: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  cardName: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: -0.2, lineHeight: 18 },
  cardMuscle: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  flipHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  flipHintText: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },

  cardBack: {
    flex: 1, backgroundColor: '#111122', borderRadius: 20,
    padding: 14, justifyContent: 'space-between',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  cardBackAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  backStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  backStat: { alignItems: 'center', gap: 3 },
  backStatVal: { fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
  backStatLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  backCues: { gap: 5, flex: 1, justifyContent: 'center' },
  backCueRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  backCueDot: { width: 4, height: 4, borderRadius: 2, flexShrink: 0 },
  backCueText: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '500', flex: 1 },
  detailBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'center',
    borderRadius: 10, borderWidth: 1, paddingVertical: 7,
  },
  detailBtnText: { fontSize: 11, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: '600' },

  // Modal
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.78)' },
  sheet: {
    backgroundColor: '#0f0f1c', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)', height: '90%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 4,
  },
  modalHero: { flexDirection: 'row', alignItems: 'flex-start', padding: 22, paddingTop: 14, gap: 12 },
  modalName: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginTop: 6, lineHeight: 26 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },

  pageTabs: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 22,
  },
  pageTab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  pageTabText: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700' },

  page: { width: W, paddingHorizontal: 22, paddingTop: 18 },
  pageDesc: { color: 'rgba(255,255,255,0.75)', fontSize: 15, lineHeight: 23, marginBottom: 20 },
  pageSubLabel: {
    color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
  },
  muscleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 },
  musclePill: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  muscleText: { fontSize: 12, fontWeight: '700' },
  tipBox: {
    marginTop: 6, borderLeftWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14,
  },
  tipLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 },
  tipText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 19 },

  cueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14 },
  cueNum: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  cueNumText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  cueText: { flex: 1, color: 'rgba(255,255,255,0.82)', fontSize: 15, lineHeight: 22 },
  equipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
  },
  equipText: { fontSize: 13, fontWeight: '700' },
  equipDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 4 },
  equipTextGray: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '600' },

  protoGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  protoBox: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 16, alignItems: 'center', gap: 6 },
  protoValue: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  protoLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '600' },
  protoNote: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  protoNoteLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  protoProgNote: {
    color: 'rgba(255,255,255,0.35)', fontSize: 13, lineHeight: 19,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 16,
  },

  demoTipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10 },
  demoTipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  demoTipText: { flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: 13.5, lineHeight: 20 },
});
